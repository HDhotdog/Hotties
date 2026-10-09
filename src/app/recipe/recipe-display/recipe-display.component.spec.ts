import { provideIonicAngular } from '@ionic/angular';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { RecipeService } from '../recipe.service';
import { CategoryService } from '../../category/category.service';
import { LabelService } from '../../label/label-service.service';

import { RecipeDisplayComponent } from './recipe-display.component';

describe('RecipeDisplayComponent', () => {
  let component: RecipeDisplayComponent;
  let fixture: ComponentFixture<RecipeDisplayComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [RecipeDisplayComponent],
      providers: [
        provideIonicAngular(),
        {provide: Router, useValue: {navigate: jest.fn()}},
        {provide: ActivatedRoute, useValue: {snapshot: {paramMap: {has: () => false, get: () => null}}}},
        {provide: Location, useValue: {back: () => {}}},
        {provide: RecipeService, useValue: {findById: () => of(undefined), getIngredients: () => of([]), getImageUrl: () => of(null)}},
        {provide: CategoryService, useValue: {getCategories: () => of([])}},
        {provide: LabelService, useValue: {getLabelsForRecipe: () => of([])}}
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RecipeDisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
