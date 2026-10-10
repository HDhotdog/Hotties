import {provideIonicAngular, ToastController} from '@ionic/angular';
import {ComponentFixture, TestBed, waitForAsync} from '@angular/core/testing';
import {Location} from '@angular/common';
import {ActivatedRoute, Router} from '@angular/router';
import {BehaviorSubject, of} from 'rxjs';
import {RecipeService} from '../recipe.service';
import {CategoryService} from '../../category/category.service';
import {LabelService} from '../../label/label-service.service';
import {StockService, Availability} from '../../domain/stock.service';
import {CatalogService} from '../../domain/catalog.service';
import {Ingredient} from '../../ingredients/ingredient.dto';

import {RecipeDisplayComponent} from './recipe-display.component';

describe('RecipeDisplayComponent', () => {
  let component: RecipeDisplayComponent;
  let fixture: ComponentFixture<RecipeDisplayComponent>;
  let stockChanges: BehaviorSubject<unknown[]>;
  let catalogChanges: BehaviorSubject<unknown[]>;
  let availabilityById: Map<string, Availability>;
  let addIngredientsToCategory: jest.Mock;
  const ingredients: Ingredient[] = [
    {id: 'salt', recipeId: 'recipe', targetNodeId: 'salt-product', name: 'Salt', amount: 1, unit: 'pinch'},
    {id: 'onion', recipeId: 'recipe', targetNodeId: 'onion-product', name: 'Onion', amount: 1, unit: 'piece'},
    {id: 'flour', recipeId: 'recipe', targetNodeId: 'flour-product', name: 'Flour', amount: 100, unit: 'g'},
    {id: 'milk', recipeId: 'recipe', targetNodeId: 'milk-product', name: 'Milk', amount: 100, unit: 'ml'}
  ];

  beforeEach(waitForAsync(() => {
    stockChanges = new BehaviorSubject<unknown[]>([]);
    catalogChanges = new BehaviorSubject<unknown[]>([]);
    availabilityById = new Map([
      ['salt-product', {status: 'enough', available: 100, unit: 'pinch'}],
      ['onion-product', {status: 'insufficient', available: 0, unit: 'piece'}],
      ['flour-product', {status: 'insufficient', available: 25, unit: 'g'}],
      ['milk-product', {status: 'unknown', available: 0, unit: 'ml'}]
    ]);
    addIngredientsToCategory = jest.fn(() => of(undefined));
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
          useValue: {findById: () => of({id: 'recipe', name: 'Soup', description: '', preparationTime: 5}),
            getIngredients: () => of(ingredients), getImageUrl: () => of(null)}
        },
        {provide: CategoryService, useValue: {
          getCategories: () => of([{id: 'shopping', name: 'Shopping', saveSuggestions: true}]),
          addIngredientsToCategory
        }},
        {provide: ToastController, useValue: {create: jest.fn(async () => ({present: jest.fn()}))}},
        {provide: LabelService, useValue: {getLabelsForRecipe: () => of([])}},
        {provide: StockService, useValue: {
          observe: () => stockChanges,
          availability: jest.fn(async (id: string) => availabilityById.get(id))
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
});
