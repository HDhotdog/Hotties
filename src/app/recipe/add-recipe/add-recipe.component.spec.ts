import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { NgxImageCompressService } from 'ngx-image-compress';
import { RecipeService } from '../recipe.service';
import { LabelService } from '../../label/label-service.service';

import { AddRecipeComponent } from './add-recipe.component';

describe('AddRecipeComponent', () => {
  let component: AddRecipeComponent;
  let fixture: ComponentFixture<AddRecipeComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [AddRecipeComponent, IonicModule.forRoot()],
      providers: [
        {provide: Location, useValue: {back: () => {}}},
        {provide: RecipeService, useValue: {findById: () => of(undefined), getIngredients: () => of([]), getImageUrl: () => of(null)}},
        {provide: ActivatedRoute, useValue: {snapshot: {paramMap: {get: () => null}}}},
        {provide: LabelService, useValue: {getTemplateLabels: () => of([]), getLabelsForRecipe: () => of([])}},
        {provide: NgxImageCompressService, useValue: {}}
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AddRecipeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
