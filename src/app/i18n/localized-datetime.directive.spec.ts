import {ElementRef} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {of} from 'rxjs';
import {SettingsRepository} from '../database/settings/settings.repository';
import {LocalizationService} from './localization.service';
import {LocalizedDatetimeDirective} from './localized-datetime.directive';

describe('Ionic date accessibility adapter', () => {
  it('translates calendar controls and keeps them translated after Ionic rerenders', async () => {
    const host = document.createElement('ion-datetime');
    const root = host.attachShadow({mode: 'open'});
    root.innerHTML = `<button part="month-year-button" aria-label="Show year picker"></button>
      <ion-button part="navigation-button previous-button"></ion-button>
      <ion-button part="navigation-button next-button"></ion-button>
      <button class="today" aria-label="Today, Friday 16 October"></button>`;
    TestBed.configureTestingModule({providers: [
      {provide: ElementRef, useValue: new ElementRef(host)},
      {provide: SettingsRepository, useValue: {save: () => of({})}},
    ]});
    const directive = TestBed.runInInjectionContext(() => new LocalizedDatetimeDirective());
    await directive.ngAfterViewInit();
    const i18n = TestBed.inject(LocalizationService);
    await i18n.setLanguage('de');
    expect(root.querySelector('[part~=previous-button]')?.getAttribute('aria-label')).toBe('Vorheriger Monat');
    expect(root.querySelector('[part=month-year-button]')?.getAttribute('aria-label')).toBe('Jahresauswahl öffnen');
    expect(root.querySelector('.today')?.getAttribute('aria-label')).toMatch(/^Heute,/);
    root.querySelector('[part=month-year-button]')!.setAttribute('aria-label', 'Hide year picker');
    await Promise.resolve();
    expect(root.querySelector('[part=month-year-button]')?.getAttribute('aria-label')).toBe('Jahresauswahl schließen');
    await i18n.setLanguage('en');
    expect(root.querySelector('.today')?.getAttribute('aria-label')).toMatch(/^Today,/);
  });
});
