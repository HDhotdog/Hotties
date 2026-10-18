import {provideIonicAngular, ToastController} from '@ionic/angular';
import {ComponentFixture, TestBed, waitForAsync} from '@angular/core/testing';
import {Location} from '@angular/common';
import {ActivatedRoute, Router} from '@angular/router';
import {BehaviorSubject, of} from 'rxjs';
import {RecipeService} from '../recipe.service';
import {CategoryService} from '../../category/category.service';
import {LabelService} from '../../label/label-service.service';
import {StockService, Availability, CookingPlan} from '../../domain/stock.service';
import {CatalogService} from '../../domain/catalog.service';
import {Ingredient} from '../../ingredients/ingredient.dto';
import {Recipe} from '../models/recipe.dto';
import {Label} from '../../label/models/label.dto';

import {RecipeDisplayComponent} from './recipe-display.component';

describe('RecipeDisplayComponent', () => {
  let component: RecipeDisplayComponent;
  let fixture: ComponentFixture<RecipeDisplayComponent>;
  let stockChanges: BehaviorSubject<unknown[]>;
  let catalogChanges: BehaviorSubject<unknown[]>;
  let availabilityById: Map<string, Availability>;
  let addIngredientsToCategory: jest.Mock;
  let planCook: jest.Mock;
  let cook: jest.Mock;
  let recipeChanges: BehaviorSubject<Recipe | null>;
  let imageChanges: BehaviorSubject<string | null>;
  let ingredientChanges: BehaviorSubject<Ingredient[]>;
  let labelChanges: BehaviorSubject<Label[]>;
  const cookPlan: CookingPlan = {
    recipeId: 'recipe', operationId: 'cook-one', fingerprint: 'snapshot', lotChanges: [{lotId: 'salt-lot', remainingAmount: 98}],
    ingredients: [{ingredientId: 'salt', name: 'Salt', required: {amount: 1, unit: 'pinch'},
      used: 1, missing: 0, unknown: false,
      deductions: [{lotId: 'salt-lot', productName: 'Salt', amount: 2, unit: 'g', remainingAmount: 98}]}]
  };
  const ingredients: Ingredient[] = [
    {id: 'salt', recipeId: 'recipe', targetNodeId: 'salt-product', name: 'Salt', amount: 1, unit: 'pinch'},
    {id: 'onion', recipeId: 'recipe', targetNodeId: 'onion-product', name: 'Onion', amount: 1, unit: 'piece'},
    {id: 'flour', recipeId: 'recipe', targetNodeId: 'flour-product', name: 'Flour', amount: 100, unit: 'g'},
    {id: 'milk', recipeId: 'recipe', targetNodeId: 'milk-product', name: 'Milk', amount: 100, unit: 'ml'}
  ];

  beforeEach(waitForAsync(() => {
    recipeChanges = new BehaviorSubject<Recipe | null>({
      id: 'recipe', name: 'Soup', description: 'Recipe notes', preparationTime: 5,
      steps: [{id: 'chop', instructions: 'Chop the onion.', ingredientIds: ['onion', 'removed']},
        {id: 'season', instructions: 'Season.', ingredientIds: ['salt']},
        {id: 'rest', instructions: 'Let it rest.', ingredientIds: []}]
    });
    imageChanges = new BehaviorSubject<string | null>(null);
    ingredientChanges = new BehaviorSubject(ingredients);
    labelChanges = new BehaviorSubject<Label[]>([]);
    stockChanges = new BehaviorSubject<unknown[]>([]);
    catalogChanges = new BehaviorSubject<unknown[]>([]);
    availabilityById = new Map([
      ['salt-product', {status: 'enough', available: 100, unit: 'pinch'}],
      ['onion-product', {status: 'insufficient', available: 0, unit: 'piece'}],
      ['flour-product', {status: 'insufficient', available: 25, unit: 'g'}],
      ['milk-product', {status: 'unknown', available: 0, unit: 'ml'}]
    ]);
    addIngredientsToCategory = jest.fn(() => of(undefined));
    planCook = jest.fn(async () => cookPlan);
    cook = jest.fn(async () => ({status: 'cooked', plan: cookPlan}));
    TestBed.configureTestingModule({
      imports: [RecipeDisplayComponent],
      providers: [
        provideIonicAngular(),
        {provide: Router, useValue: {navigate: jest.fn()}},
        {provide: ActivatedRoute, useValue: {snapshot: {paramMap: {has: () => true, get: () => 'recipe'}}}},
        {
          provide: Location, useValue: {
            back: () => {
            }
          }
        },
        {
          provide: RecipeService,
          useValue: {observeById: jest.fn(() => recipeChanges),
            getIngredients: () => ingredientChanges, observeImageUrl: () => imageChanges}

        },
        {provide: CategoryService, useValue: {
          getCategories: () => of([{id: 'shopping', name: 'Shopping', saveSuggestions: true}]),
          addIngredientsToCategory
        }},
        {provide: ToastController, useValue: {create: jest.fn(async () => ({present: jest.fn()}))}},
        {provide: LabelService, useValue: {getLabelsForRecipe: () => labelChanges}},
        {provide: StockService, useValue: {
          observe: () => stockChanges,
          availability: jest.fn(async (id: string) => availabilityById.get(id)), planCook, cook
        }},
        {provide: CatalogService, useValue: {observe: () => catalogChanges}}
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RecipeDisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('identifies available, missing, partial, and uncertain ingredients with text and color classes', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    const rows = Array.from(fixture.nativeElement.querySelectorAll('.ingredient-row')) as HTMLElement[];
    expect(rows).toHaveLength(4);
    expect(rows.map(row => row.querySelector('.ingredient-status')?.textContent?.trim()))
      .toEqual(['Available', 'Missing', 'Need more', 'Check quantity']);
    expect(rows.map(row => [...row.classList].find(name => ['available', 'missing', 'unknown'].includes(name))))
      .toEqual(['available', 'missing', 'missing', 'unknown']);
  });

  it('updates an ingredient when stock or its catalog conversion changes', async () => {
    await fixture.whenStable();
    availabilityById.set('onion-product', {status: 'enough', available: 12, unit: 'piece'});
    stockChanges.next([]);
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    expect(component.availabilityFor(ingredients[1])?.status).toBe('enough');

    availabilityById.set('milk-product', {status: 'enough', available: 100, unit: 'ml'});
    catalogChanges.next([]);
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    expect(component.availabilityFor(ingredients[3])?.status).toBe('enough');
  });

  it('exports only the missing amounts, excluding available and unknown ingredients', async () => {
    await fixture.whenStable();
    component.initExportModal();
    expect(component.canConfirmExport()).toBe(true);
    expect(component.missingIngredients.map(item => [item.name, item.amount]))
      .toEqual([['Onion', 1], ['Flour', 75]]);

    component.confirmExport();
    expect(addIngredientsToCategory).toHaveBeenCalledWith('shopping', [
      expect.objectContaining({id: 'onion', amount: 1, unit: 'piece'}),
      expect.objectContaining({id: 'flour', amount: 75, unit: 'g'})
    ]);
  });

  it('disables export when no ingredient is confirmed missing', async () => {
    await fixture.whenStable();
    availabilityById.set('onion-product', {status: 'enough', available: 12, unit: 'piece'});
    availabilityById.set('flour-product', {status: 'enough', available: 100, unit: 'g'});
    stockChanges.next([]);
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(component.missingIngredients).toEqual([]);
    expect((fixture.nativeElement.querySelector('#export-trigger') as HTMLElement).hasAttribute('disabled')).toBe(true);
    component.initExportModal();
    component.confirmExport();
    expect(addIngredientsToCategory).not.toHaveBeenCalled();
  });

  it('opens a Mark as cooked review, cancels without saving, and confirms only after review', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('.cooked-button') as HTMLElement;
    expect(button.textContent).toContain('Mark as cooked');
    button.click();
    await fixture.whenStable();
    expect(planCook).toHaveBeenCalledWith('recipe');
    expect(component.cookReviewOpen).toBe(true);
    expect(component.cookReview?.ingredients[0].deductions[0].amount).toBe(2);
    component.closeCookReview();
    expect(cook).not.toHaveBeenCalled();
    await component.openCookReview();
    await component.confirmCook();
    expect(cook).toHaveBeenCalledWith('recipe', cookPlan);
    expect(component.cookReviewOpen).toBe(false);
  });

  it('keeps the review open when stock changes and blocks a duplicate save', async () => {
    await component.openCookReview();
    const updated = {...cookPlan, fingerprint: 'new-snapshot'};
    cook.mockResolvedValueOnce({status: 'changed', plan: updated});
    await component.confirmCook();
    expect(component.cookReviewOpen).toBe(true);
    expect(component.cookReview?.fingerprint).toBe('new-snapshot');
    expect(component.i18n.t(component.cookReviewMessage)).toMatch(/Review the updated amounts/);

    let finish!: (result: unknown) => void;
    cook.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const pending = component.confirmCook();
    await component.confirmCook();
    expect(cook).toHaveBeenCalledTimes(2);
    expect(component.cookReviewOpen).toBe(true);
    component.closeCookReview();
    expect(component.cookReviewOpen).toBe(true);
    finish({status: 'cooked', plan: updated});
    await pending;
    expect(component.cookReviewOpen).toBe(false);
  });
  it('shows descriptions separately and resolves only ingredients assigned to each step', () => {
    expect(component.canStartCooking).toBe(true);
    expect(component.ingredientsForStep(component.steps[0]).map(item => item.id)).toEqual(['onion']);
    expect(fixture.nativeElement.querySelector('.recipe-description').textContent).toContain('Recipe notes');
    const steps = fixture.nativeElement.querySelectorAll('.recipe-step');
    expect(steps).toHaveLength(3);
    expect(steps[0].textContent).toContain('1 piece Onion');
    expect(steps[0].textContent).not.toContain('Salt');
    expect(steps[2].textContent).toContain('No ingredients needed');
  });

  it('captures cooking data, closes at any point and never deducts stock', () => {
    component.openCookingMode();
    expect(component.cookingModeOpen).toBe(true);
    expect(component.cookingSlides[0].ingredients).toEqual([ingredients[1]]);
    expect(component.cookingSlides[0].ingredients[0]).not.toBe(ingredients[1]);
    component.recipe.steps![0].instructions = 'Edited elsewhere.';
    expect(component.cookingSlides[0].instructions).toBe('Chop the onion.');
    component.closeCookingMode();
    expect(component.cookingModeOpen).toBe(false);
    component.openCookingMode();
    expect(component.cookingSlides[0].instructions).toBe('Edited elsewhere.');
    component.ionViewWillLeave();
    expect(component.cookingModeOpen).toBe(false);
    expect(cook).not.toHaveBeenCalled();
    expect(planCook).not.toHaveBeenCalled();
  });

  it('disables modal animation when reduced motion is requested', () => {
    const original = globalThis.matchMedia;
    globalThis.matchMedia = jest.fn().mockReturnValue({matches: true});
    try {
      component.openCookingMode();
      expect(component.cookingModeAnimated).toBe(false);
    } finally {
      globalThis.matchMedia = original;
    }
  });

  it('refreshes saved steps when returning from the editor and blocks incomplete recipes', () => {
    const service = TestBed.inject(RecipeService);
    (service.observeById as jest.Mock).mockReturnValue(of({
      id: 'recipe', name: 'Soup', description: 'Notes', preparationTime: 5,
      steps: [{id: 'draft', instructions: '   ', ingredientIds: []}]
    }));
    component.ionViewWillLeave();
    component.ionViewWillEnter();
    fixture.detectChanges();
    expect(component.steps[0].id).toBe('draft');
    expect(component.canStartCooking).toBe(false);
    expect(fixture.nativeElement.querySelector('.recipe-instructions').textContent).toContain('Complete or remove');
    component.openCookingMode();
    expect(component.cookingModeOpen).toBe(false);
    component.recipe.steps = [];
    expect(component.canStartCooking).toBe(false);
  });

  it('updates all saved recipe fields in the existing detail view without re-entering it', () => {
    recipeChanges.next({...component.recipe, description: ''});
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.recipe-description')).toBeNull();
    recipeChanges.next({
      ...component.recipe, name: 'Updated soup', description: 'Newly added notes', preparationTime: 65, emoji: '🍲',
      steps: [{id: 'updated', instructions: 'Cook gently.', ingredientIds: ['salt']}]
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.recipe-header').textContent).toContain('Updated soup');
    expect(fixture.nativeElement.querySelector('.recipe-header').textContent).toContain('1 h 5 min');
    expect(fixture.nativeElement.querySelector('.emoji-display').textContent).toContain('🍲');
    expect(fixture.nativeElement.querySelector('.recipe-description-content').textContent).toContain('Newly added notes');
    expect(fixture.nativeElement.querySelectorAll('.recipe-step')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('.recipe-step').textContent).toContain('Cook gently.');
    recipeChanges.next({...component.recipe, description: '', emoji: null});
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.recipe-description')).toBeNull();
    expect(fixture.nativeElement.querySelector('.emoji-display')).toBeNull();
  });

  it('keeps ingredient amounts, step ingredients and labels in sync with saved related records', async () => {
    ingredientChanges.next([{...ingredients[0], amount: 2}]);
    labelChanges.next([{id: 'dinner', recipeId: 'recipe', groupId: 'meal', name: 'Dinner'}]);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.ingredient-row')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('.ingredient-row').textContent).toContain('2 pinch');
    expect(fixture.nativeElement.querySelector('.recipe-labels').textContent).toContain('Dinner');
    expect(fixture.nativeElement.querySelectorAll('.recipe-step')[1].textContent).toContain('2 pinches Salt');
  });

  it('shows, replaces and removes saved images and releases superseded object URLs', () => {
    const original = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');
    const revoke = jest.fn();
    Object.defineProperty(URL, 'revokeObjectURL', {value: revoke, configurable: true});
    try {
      imageChanges.next('blob:first-image');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.recipe-image').src).toBe('blob:first-image');
      imageChanges.next('blob:replacement-image');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.recipe-image').src).toBe('blob:replacement-image');
      expect(revoke).toHaveBeenCalledWith('blob:first-image');
      imageChanges.next(null);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.recipe-image')).toBeNull();
      expect(revoke).toHaveBeenCalledWith('blob:replacement-image');
      imageChanges.next('blob:last-image');
      component.ngOnDestroy();
      expect(revoke).toHaveBeenCalledWith('blob:last-image');
      recipeChanges.next({...component.recipe, name: 'Ignored after destroy'});
      imageChanges.next('blob:ignored-after-destroy');
      expect(component.recipe.name).toBe('Soup');
      expect(component.imageUrl).toBeNull();
    } finally {
      if (original) Object.defineProperty(URL, 'revokeObjectURL', original);
      else delete (URL as {revokeObjectURL?: unknown}).revokeObjectURL;
    }
  });

  it('handles deletion from the live query without retaining stale recipe content', () => {
    recipeChanges.next(null);
    fixture.detectChanges();
    expect(component.recipeMissing).toBe(true);
    expect(component.canStartCooking).toBe(false);
    expect(fixture.nativeElement.querySelector('.recipe-wrapper')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('This recipe is no longer available');
  });

});
