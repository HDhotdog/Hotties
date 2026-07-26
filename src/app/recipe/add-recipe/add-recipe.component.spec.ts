import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { NgxImageCompressService } from 'ngx-image-compress';
import { RecipeService } from '../recipe.service';
import { LabelService } from '../../label/label-service.service';
import { ItemService } from '../../item/item.service';
import { TranslateModule } from '@ngx-translate/core';

import { AddRecipeComponent } from './add-recipe.component';

describe('AddRecipeComponent', () => {
  let component: AddRecipeComponent;
  let fixture: ComponentFixture<AddRecipeComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [AddRecipeComponent, IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [
        {provide: Location, useValue: {back: () => {}}},
        {provide: RecipeService, useValue: {findById: () => of(undefined), getIngredients: () => of([]), getImageUrl: () => of(null)}},
        {provide: ActivatedRoute, useValue: {snapshot: {paramMap: {get: () => null}}}},
        {provide: LabelService, useValue: {getTemplateLabels: () => of([]), getLabelsForRecipe: () => of([])}},
        {provide: NgxImageCompressService, useValue: {}},
        {provide: ItemService, useValue: {findAll: () => of([])}}
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AddRecipeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
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
