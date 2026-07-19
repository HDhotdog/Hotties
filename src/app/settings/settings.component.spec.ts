import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';

import { SettingsComponent } from './settings.component';

describe('SettingsComponent', () => {
  let component: SettingsComponent;
  let fixture: ComponentFixture<SettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsComponent, IonicModule.forRoot()],
      providers: [
        {provide: Router, useValue: {navigate: jest.fn()}},
        {provide: ActivatedRoute, useValue: {}}
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
