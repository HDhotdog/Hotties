import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { Location } from '@angular/common';
import { of } from 'rxjs';
import { LabelService } from '../../label/label-service.service';

import { LabelSettingComponent } from './label-setting.component';

describe('LabelComponentComponent', () => {
  let component: LabelSettingComponent;
  let fixture: ComponentFixture<LabelSettingComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [LabelSettingComponent, IonicModule.forRoot()],
      providers: [
        {provide: Location, useValue: {back: () => {}}},
        {
          provide: LabelService,
          useValue: {
            getAllLabelGroups: () => of([]),
            getAllLabels: () => of([])
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LabelSettingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
