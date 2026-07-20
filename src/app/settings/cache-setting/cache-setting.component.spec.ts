import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { Location } from '@angular/common';
import { CategoryService } from '../../category/category.service';

import { CacheSettingComponent } from './cache-setting.component';

describe('CacheSettingComponent', () => {
  let component: CacheSettingComponent;
  let fixture: ComponentFixture<CacheSettingComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [CacheSettingComponent, IonicModule.forRoot()],
      providers: [
        {provide: Location, useValue: {back: () => {}}},
        {provide: CategoryService, useValue: {}}
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CacheSettingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
