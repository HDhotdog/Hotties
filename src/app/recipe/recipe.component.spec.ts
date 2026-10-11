import {provideIonicAngular} from '@ionic/angular';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {of, Subject} from 'rxjs';

import {RecipeComponent} from './recipe.component';
import {RecipeService} from './recipe.service';
import {LabelService} from '../label/label-service.service';
import {StockService} from '../domain/stock.service';
import {CatalogService} from '../domain/catalog.service';
import {ActivatedRoute, Router} from '@angular/router';

describe('RecipeComponent', () => {
  let component: RecipeComponent;
  let fixture: ComponentFixture<RecipeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecipeComponent],
      providers: [
        provideIonicAngular(),
        {
          provide: RecipeService,
          useValue: {findAll: () => of([]), getImageUrl: () => of(null), getIngredients: () => of([])},
        },
        {
          provide: LabelService,
          useValue: {
            getAllLabels: () => of([]),
            getAllLabelGroups: () => of([]),
          },
        },
        {
          provide: StockService,
          useValue: {observe: () => of([])},
        },
        {provide: CatalogService, useValue: {observe: () => of([])}},
        {
          provide: Router,
          useValue: {navigate: jest.fn()},
        },
        {
          provide: ActivatedRoute,
          useValue: {},
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RecipeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('guides users to add their first recipe when the list is empty', () => {
    expect(fixture.nativeElement.textContent).toContain('Your recipe list is empty');
    expect(fixture.nativeElement.textContent).toContain('Tap + above to add your first recipe.');
  });

  it('explains when search has no matching recipes', () => {
    (component as any)._recipes = [{id: 'recipe', name: 'Soup', preparationTime: 5}];
    component.search = 'Pizza';
    component.filterRecipes();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No matching recipes');
    expect(fixture.nativeElement.textContent).toContain('Try a different search or clear your filters.');
    expect(fixture.nativeElement.textContent).not.toContain('Your recipe list is empty');
  });

  it('refreshes recipe readiness when catalog conversions change', async () => {
    const catalogChanges = new Subject<unknown[]>();
    let converted = false;
    (component as any).catalog = {observe: () => catalogChanges};
    (component as any).stock = {observe: () => of([]), availability: jest.fn(async () => ({
      status: converted ? 'enough' : 'unknown', available: converted ? 100 : 0,
      unit: 'pinch'
    }))};
    (component as any).recipeService = {
      findAll: () => of([{id: 'recipe', name: 'Soup', description: '', preparationTime: 5}]),
      getIngredients: () => of([{
        id: 'salt', recipeId: 'recipe', targetNodeId: 'spices', name: 'Salt', amount: 1, unit: 'pinch'
      }]),
      getImageUrl: () => of(null)
    };
    component.ngOnInit();
    catalogChanges.next([]);
    await fixture.whenStable();
    expect(component.ingredientAvailabilityFor('recipe')).toEqual({total: 1, available: 0, unknown: 1});
    converted = true;
    catalogChanges.next([]);
    await fixture.whenStable();
    expect(component.ingredientAvailabilityFor('recipe')).toEqual({total: 1, available: 1, unknown: 0});
  });
});
