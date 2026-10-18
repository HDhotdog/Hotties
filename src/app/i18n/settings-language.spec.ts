import {TestBed} from '@angular/core/testing';
import {ActivatedRoute, Router} from '@angular/router';
import {provideIonicAngular} from '@ionic/angular';
import {of, throwError} from 'rxjs';
import {SettingsRepository} from '../database/settings/settings.repository';
import {SettingsComponent} from '../settings/settings.component';

describe('Settings language selection', () => {
  it('updates an existing settings view and rolls back the selector after a failed save', async () => {
    const save = jest.fn().mockReturnValue(of({}));
    TestBed.configureTestingModule({imports: [SettingsComponent], providers: [provideIonicAngular(),
      {provide: Router, useValue: {navigate: jest.fn()}}, {provide: ActivatedRoute, useValue: {}},
      {provide: SettingsRepository, useValue: {save}},
    ]});
    const fixture = TestBed.createComponent(SettingsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    await component.changeLanguage('de'); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('ion-title').textContent).toContain('Einstellungen');
    const select = fixture.nativeElement.querySelector('ion-select');
    select.value = 'en';
    save.mockReturnValue(throwError(() => new Error('disk failure')));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await component.changeLanguage('en'); fixture.detectChanges();
    expect(component.i18n.language()).toBe('de');
    expect(select.value).toBe('de');
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain('Sprache konnte nicht gespeichert');
  });
});
