import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule, ToastController } from '@ionic/angular';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { CategoryService } from 'src/app/category/category.service';

import { AddCategorySettingComponent } from './add-category-setting.component';

describe('AddCategorySettingComponent', () => {
  let component: AddCategorySettingComponent;
  let fixture: ComponentFixture<AddCategorySettingComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [AddCategorySettingComponent, IonicModule.forRoot()],
      providers: [
        {provide: Location, useValue: {back: () => {}}},
        {
          provide: CategoryService,
          useValue: {getCategoryById: () => of(null), getCategories: () => of([])}
        },
        {provide: ToastController, useValue: {create: () => Promise.resolve({present: () => Promise.resolve()})}},
        {provide: ActivatedRoute, useValue: {snapshot: {paramMap: {get: () => null}}}}
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AddCategorySettingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
