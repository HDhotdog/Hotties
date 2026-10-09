import { provideIonicAngular } from '@ionic/angular';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { Location } from '@angular/common';
import { of } from 'rxjs';
import { SuggestionService } from '../../todo/suggestion/suggestion.service';

import { SuggestionSettingComponent } from './suggestion-setting.component';

describe('SuggestionSettingComponent', () => {
  let component: SuggestionSettingComponent;
  let fixture: ComponentFixture<SuggestionSettingComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [SuggestionSettingComponent],
      providers: [
        provideIonicAngular(),
        {provide: SuggestionService, useValue: {findAll: () => of([])}},
        {provide: Location, useValue: {back: () => {}}}
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SuggestionSettingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
