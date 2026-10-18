import {provideIonicAngular} from '@ionic/angular';
import {ComponentFixture, TestBed, waitForAsync} from '@angular/core/testing';
import {Location} from '@angular/common';
import {ActivatedRoute, Router} from '@angular/router';
import {of, Subject, throwError} from 'rxjs';
import {NgxImageCompressService} from 'ngx-image-compress';
import {RecipeService} from '../recipe.service';
import {LabelService} from '../../label/label-service.service';
import {CatalogService} from '../../domain/catalog.service';
import {CatalogNode} from '../../domain/catalog.model';

import {AddRecipeComponent} from './add-recipe.component';

describe('AddRecipeComponent', () => {
  let component: AddRecipeComponent;
  let fixture: ComponentFixture<AddRecipeComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [AddRecipeComponent],
      providers: [
        provideIonicAngular(),
        {
          provide: Location, useValue: {
            back: () => {
            }
          }
        },
        {
          provide: RecipeService,
          useValue: {findById: jest.fn(() => of(undefined)), getIngredients: () => of([]), getImageUrl: () => of(null),
            save: jest.fn(recipe => of(recipe)), saveIngredients: jest.fn(() => of(undefined)),
            saveImage: jest.fn(() => of(undefined)), deleteImage: jest.fn(() => of(undefined))}
        },
        {provide: Router, useValue: {navigate: jest.fn()}},
        {provide: ActivatedRoute, useValue: {snapshot: {paramMap: {get: () => null}}}},
        {provide: LabelService, useValue: {getTemplateLabels: () => of([]), getLabelsForRecipe: () => of([]), saveLabelsForRecipe: jest.fn(() => of(undefined))}},
        {provide: NgxImageCompressService, useValue: {}},
        {provide: CatalogService, useValue: {observe: () => of([])}}
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AddRecipeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('keeps the recipe quantity independent of a selected product package', () => {
    const product: CatalogNode = {
      id: 'carton', parentId: 'milk', kind: 'product', name: 'Brand milk',
      brand: 'Brand', barcodes: [], saleKind: 'fixed', packageAmount: 1000, packageUnit: 'ml',
      variableUnit: null, rawPackage: '1 l', unitConversions: {}
    };
    component.ingredientModalMode = 'existing';
    component.selectExistingItem(product);
    component.ingredientAmount = 200;
    component.newItemUnit = 'ml';
    (component as any).scheduleAutoSave = jest.fn();
    component.confirmAddIngredient();
    expect(component.ingredients[0]).toMatchObject({targetNodeId: 'carton', amount: 200, unit: 'ml'});
  });

  it('adds, edits, reorders and removes steps and clears removed ingredient links', () => {
    component.ingredients = [{id: 'salt', recipeId: 'recipe', name: 'Salt', amount: 1, unit: 'pinch'}];
    component.addStep();
    component.addStep();
    const [first, second] = component.steps;
    component.updateStepInstructions(first.id, 'Season the soup.');
    component.openStepIngredients(first);
    component.toggleDraftStepIngredient('salt', true);
    component.toggleDraftStepIngredient('salt', true);
    component.confirmStepIngredients();
    component.openStepIngredients(second);
    component.toggleDraftStepIngredient('salt', true);
    component.confirmStepIngredients();
    expect(component.steps[0].ingredientIds).toEqual(['salt']);
    component.moveStep(0, -1);
    expect(component.steps[0].id).toBe(first.id);
    component.moveStep(1, -1);
    expect(component.steps.map(step => step.id)).toEqual([second.id, first.id]);
    component.removeIngredient(component.ingredients[0]);
    expect(component.steps.every(step => step.ingredientIds.length === 0)).toBe(true);
    component.removeStep(second.id);
    expect(component.steps).toEqual([{id: first.id, instructions: 'Season the soup.', ingredientIds: []}]);
    expect(component.inputChanged()).toBe(true);
  });

  it('uses one shared ingredient picker, applies changes only on Save and restores selections on reopen', () => {
    component.ingredients = [
      {id: 'salt', recipeId: 'recipe', name: 'Salt', amount: 1, unit: 'pinch'},
      {id: 'onion', recipeId: 'recipe', name: 'Onion', amount: 1, unit: 'piece'}
    ];
    component.addStep();
    component.addStep();
    component.openStepIngredients(component.steps[0]);
    component.toggleDraftStepIngredient('salt', true);
    expect(component.steps[0].ingredientIds).toEqual([]);
    component.closeStepIngredients();
    component.openStepIngredients(component.steps[0]);
    expect(component.stepIngredientDraftIds).toEqual([]);
    component.toggleDraftStepIngredient('onion', true);
    component.confirmStepIngredients();
    expect(component.steps[0].ingredientIds).toEqual(['onion']);
    expect(component.steps[1].ingredientIds).toEqual([]);
    expect(component.stepIngredientStepId).toBeNull();
    component.openStepIngredients(component.steps[0]);
    expect(component.stepIngredientDraftIds).toEqual(['onion']);
    component.toggleDraftStepIngredient('onion', false);
    component.confirmStepIngredients();
    expect(component.steps[0].ingredientIds).toEqual([]);
  });

  it('ignores ingredients removed while the picker is open and closes it when its step is removed', () => {
    component.ingredients = [{id: 'salt', recipeId: 'recipe', name: 'Salt', amount: 1, unit: 'pinch'}];
    component.addStep();
    component.openStepIngredients(component.steps[0]);
    component.toggleDraftStepIngredient('salt', true);
    component.removeIngredient(component.ingredients[0]);
    component.confirmStepIngredients();
    expect(component.steps[0].ingredientIds).toEqual([]);
    component.openStepIngredients(component.steps[0]);
    component.removeStep(component.steps[0].id);
    expect(component.stepIngredientStepId).toBeNull();
  });

  it('persists a new recipe with steps only after explicit Save', async () => {
    const service = TestBed.inject(RecipeService);
    component.name = 'Soup';
    component.addStep();
    component.updateStepInstructions(component.steps[0].id, 'Simmer.');
    expect(service.save).not.toHaveBeenCalled();
    component.saveRecipe();
    await fixture.whenStable();
    expect(service.save).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Soup', steps: [{id: component.steps[0].id, instructions: 'Simmer.', ingredientIds: []}]
    }));
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/tabs/recipe']);
  });

  describe('editing autosave', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      const route = TestBed.inject(ActivatedRoute);
      route.snapshot.paramMap.get = () => 'recipe';
      (TestBed.inject(RecipeService).findById as jest.Mock).mockReturnValue(of({
        id: 'recipe', name: 'Soup', description: 'Notes', preparationTime: 5,
        steps: [{id: 'first', instructions: 'Chop.', ingredientIds: []}]
      }));
      component.ngOnInit();
    });

    afterEach(() => {
      fixture.destroy();
      jest.useRealTimers();
    });

    it('serializes immutable snapshots and stays unsaved until the latest edit is written', async () => {
      const service = TestBed.inject(RecipeService);
      const firstWrite = new Subject<unknown>();
      (service.save as jest.Mock).mockReturnValueOnce(firstWrite);
      component.updateStepInstructions('first', 'First version.');
      jest.advanceTimersByTime(500);
      await Promise.resolve();
      expect(service.save).toHaveBeenCalledTimes(1);
      const firstSnapshot = (service.save as jest.Mock).mock.calls[0][0];
      component.updateStepInstructions('first', 'Second version.');
      component.addStep();
      jest.advanceTimersByTime(500);
      await Promise.resolve();
      expect(service.save).toHaveBeenCalledTimes(1);
      expect(firstSnapshot.steps).toEqual([{id: 'first', instructions: 'First version.', ingredientIds: []}]);
      expect(component.saveStatus).toBe('unsaved');
      const leaving = component.navigateBack();
      expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
      firstWrite.next(firstSnapshot);
      firstWrite.complete();
      await leaving;
      expect(service.save).toHaveBeenCalledTimes(2);
      expect((service.save as jest.Mock).mock.calls[1][0].steps).toEqual([
        {id: 'first', instructions: 'Second version.', ingredientIds: []},
        {id: component.steps[1].id, instructions: '', ingredientIds: []}
      ]);
      expect(component.saveStatus).toBe('saved');
      expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/tabs/recipe/display', 'recipe']);
    });

    it('flushes a further edit made while the back button waits for an earlier save', async () => {
      const service = TestBed.inject(RecipeService);
      const firstWrite = new Subject<unknown>();
      (service.save as jest.Mock).mockReturnValueOnce(firstWrite);
      component.updateStepInstructions('first', 'First edit.');
      const leaving = component.navigateBack();
      await Promise.resolve();
      component.updateStepInstructions('first', 'Edit while saving.');
      firstWrite.next({});
      firstWrite.complete();
      await leaving;
      expect((service.save as jest.Mock).mock.calls.map(call => call[0].steps[0].instructions))
        .toEqual(['First edit.', 'Edit while saving.']);
      expect(component.saveStatus).toBe('saved');
      expect(TestBed.inject(Router).navigate).toHaveBeenCalledTimes(1);
    });

    it('flushes edits before leaving, reports failures and permits retry', async () => {
      const service = TestBed.inject(RecipeService);
      (service.save as jest.Mock).mockReturnValueOnce(throwError(() => new Error('Write failed')));
      component.updateStepInstructions('first', 'Updated.');
      await component.navigateBack();
      expect(component.i18n.t(component.saveError)).toContain('Could not save');
      expect(component.saveStatus).toBe('unsaved');
      expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
      await component.navigateBack();
      expect(service.save).toHaveBeenCalledTimes(2);
      expect(component.i18n.t(component.saveError)).toBe('');
      expect(component.saveStatus).toBe('saved');
      expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/tabs/recipe/display', 'recipe']);
    });
  });

  describe('uploadFile()', () => {
    // A 1x1 transparent PNG.
    const TINY_PNG_DATA_URL =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

    it('selects the image when the compress service resolves', async () => {
      const imageCompress = TestBed.inject(NgxImageCompressService) as any;
      imageCompress.uploadAndGetImageWithMaxSize = () => Promise.resolve(TINY_PNG_DATA_URL);

      component.uploadFile();
      await fixture.whenStable();

      // The image is re-encoded (cropped to a square, max 300x300) after
      // upload, so the preview URL is no longer the original data URL.
      expect(component.imageSelected).toBe(true);
      expect(component.imagePreviewUrl).toMatch(/^data:image\/jpeg;base64,/);
    });

    it('still selects the image when the compress service rejects (e.g. it could not shrink the file further)', async () => {
      // NgxImageCompressService rejects instead of resolving once it can't
      // reduce the file size any more - common for already-small images -
      // but the rejection still carries a usable data URL (see uploadCompressedFile()).
      const imageCompress = TestBed.inject(NgxImageCompressService) as any;
      imageCompress.uploadAndGetImageWithMaxSize = () => Promise.reject(TINY_PNG_DATA_URL);

      component.uploadFile();
      await fixture.whenStable();

      expect(component.imageSelected).toBe(true);
      expect(component.imagePreviewUrl).toMatch(/^data:image\/jpeg;base64,/);
    });
  });
});
