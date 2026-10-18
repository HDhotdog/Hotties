import {TestBed} from '@angular/core/testing';
import {of, Subject, throwError} from 'rxjs';
import {SettingsRepository} from '../database/settings/settings.repository';
import {AppError, message} from './language-pack';
import {LocalizationService} from './localization.service';

describe('LocalizationService', () => {
  let service: LocalizationService;
  let settings: {findByKey: jest.Mock; save: jest.Mock};
  beforeEach(() => {
    settings = {findByKey: jest.fn().mockReturnValue(of(null)), save: jest.fn().mockReturnValue(of({}))};
    TestBed.configureTestingModule({providers: [{provide: SettingsRepository, useValue: settings}]});
    service = TestBed.inject(LocalizationService);
  });
  it('defaults to English and restores the persisted preference before startup completes', async () => {
    expect(service.language()).toBe('en');
    settings.findByKey.mockReturnValue(of({key: 'language', value: 'de'}));
    await service.initialize();
    expect(service.t('ui.settings')).toBe('Einstellungen');
    expect(document.documentElement.lang).toBe('de');
    expect(document.documentElement.dir).toBe('ltr');
    expect(settings.save).not.toHaveBeenCalled();
  });
  it.each([null, {value: 'unsupported'}])('uses English when the preference is missing or unsupported: %s', async saved => {
    settings.findByKey.mockReturnValue(of(saved));
    await service.initialize();
    expect(service.language()).toBe('en');
  });
  it('serializes writes and preserves the last successfully saved language after failure', async () => {
    const firstWrite = new Subject<unknown>();
    settings.save.mockReturnValueOnce(firstWrite).mockReturnValueOnce(throwError(() => new Error('disk failure')));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const first = service.setLanguage('de');
    const second = service.setLanguage('en').catch(error => error);
    await Promise.resolve();
    expect(settings.save).toHaveBeenCalledTimes(1);
    expect(service.language()).toBe('en');
    firstWrite.next({}); firstWrite.complete();
    await first;
    expect((await second).translationKey).toBe('errors.saveLanguage');
    expect(service.language()).toBe('de');
    expect(settings.save.mock.calls.map(([setting]) => setting.value)).toEqual(['de', 'en']);
    await service.setLanguage('en');
    expect(service.language()).toBe('en');
  });
  it('supports offline startup and falls back when reading settings fails', async () => {
    settings.findByKey.mockReturnValue(throwError(() => new Error('unavailable storage')));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await service.initialize();
    expect(service.t('ui.settings')).toBe('Settings');
  });
  it('localizes quantities, ICU plurals, dates, money and existing status messages reactively', async () => {
    const status = message('stock.added', {count: 2, name: 'Brezeln'});
    expect(service.t(status)).toBe('2 Brezeln added to fridge.');
    expect(service.quantity(1, 'piece')).toBe('1 piece');
    expect(service.quantity(2, 'piece')).toBe('2 pieces');
    expect(service.date('2026-10-16')).toBe('16/10/2026');
    await service.setLanguage('de');
    expect(service.t(status)).toBe('2 Brezeln zum Kühlschrank hinzugefügt.');
    expect(service.quantity(1.5, 'kg')).toBe('1,5 kg');
    expect(service.t('format.ingredients', {count: 1})).toBe('1 Zutat');
    expect(service.t('format.ingredients', {count: 2})).toBe('2 Zutaten');
    expect(service.date('2026-10-16')).toBe('16.10.2026');
    expect(service.currency(1.5)).toContain('1,50');
    expect(service.duration(65)).toBe('1 Std. 5 Min.');
  });
  it('resolves built-in names while keeping user names verbatim', async () => {
    const root = {origin: 'app' as const, name: 'Food', translationKey: 'starter.food'};
    const custom = {name: 'ui.settings'};
    await service.setLanguage('de');
    expect(service.name(root)).toBe('Lebensmittel');
    expect(service.name(custom)).toBe('ui.settings');
    expect(root.name).toBe('Food');
  });
  it('shows localized coded errors without exposing arbitrary exception text', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await service.setLanguage('de');
    expect(service.t(service.error(new AppError('ui.quantityMustBeGreaterThanZero', 'Quantity must be greater than zero.'))))
      .toBe('Die Menge muss größer als null sein.');
    expect(service.t(service.error({code: 'MICROPHONE_DENIED'}))).toContain('Mikrofonzugriff');
    expect(service.t(service.error(new Error('internal secret detail')))).not.toContain('internal secret');
  });
});
