import {Component, inject} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {FormsModule} from '@angular/forms';
import {of} from 'rxjs';
import {SettingsRepository} from '../database/settings/settings.repository';
import {LocalizedNumberDirective} from './localized-number.directive';
import {LocalizationService} from './localization.service';

@Component({selector: 'app-number-test', standalone: true, imports: [FormsModule, LocalizedNumberDirective],
  template: '<input appLocalizedNumber type="number" [(ngModel)]="amount">'})
class NumberTestComponent {
  amount: number | null = 1.5;
  i18n = inject(LocalizationService);
}

describe('Localized decimal editing', () => {
  it('accepts a German comma without changing the numeric stored value and reformats after switching', async () => {
    TestBed.configureTestingModule({imports: [NumberTestComponent], providers: [
      {provide: SettingsRepository, useValue: {save: () => of({})}},
    ]});
    const fixture = TestBed.createComponent(NumberTestComponent);
    const service = TestBed.inject(LocalizationService);
    fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    expect(input.value).toBe('1.5');
    await service.setLanguage('de'); fixture.detectChanges(); await fixture.whenStable();
    expect(input.value).toBe('1,5');
    input.dispatchEvent(new Event('focus'));
    input.value = '2,75'; input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.componentInstance.amount).toBe(2.75);
    input.dispatchEvent(new Event('blur'));
    await service.setLanguage('en'); fixture.detectChanges(); await fixture.whenStable();
    expect(input.value).toBe('2.75');
    input.value = '1,234.5'; input.dispatchEvent(new Event('input'));
    expect(fixture.componentInstance.amount).toBeNull();
  });
});
