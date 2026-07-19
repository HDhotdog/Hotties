import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { CategoryService } from 'src/app/category/category.service';

import { CategorySettingComponent } from './category-setting.component';

describe('CategorySettingComponent', () => {
  let component: CategorySettingComponent;
  let fixture: ComponentFixture<CategorySettingComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [CategorySettingComponent, IonicModule.forRoot()],
      providers: [
        {provide: CategoryService, useValue: {getCategories: () => of([])}},
        {provide: Location, useValue: {back: () => {}}},
        {provide: Router, useValue: {navigate: jasmine.createSpy('navigate')}},
        {provide: ActivatedRoute, useValue: {}}
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CategorySettingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
