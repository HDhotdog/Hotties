import {TestBed} from '@angular/core/testing';
import {Capacitor} from '@capacitor/core';
import {of} from 'rxjs';
import {SettingsRepository} from '../database/settings/settings.repository';
import {LocalizationService} from '../i18n/localization.service';
import {AiModelService} from './ai-model.service';

const mockStatus = jest.fn();
const mockStart = jest.fn();
const mockLocalize = jest.fn();
jest.mock('@capacitor/core', () => ({
  Capacitor: {getPlatform: jest.fn()},
  registerPlugin: () => ({status: (...args: unknown[]) => mockStatus(...args),
    start: (...args: unknown[]) => mockStart(...args), localize: (...args: unknown[]) => mockLocalize(...args)}),
}));

describe('AI model notification language', () => {
  beforeEach(() => {
    jest.mocked(Capacitor.getPlatform).mockReturnValue('android');
    mockStatus.mockReset().mockResolvedValue({state: 'missing'});
    mockStart.mockReset().mockResolvedValue({state: 'downloading'});
    mockLocalize.mockReset().mockResolvedValue(undefined);
    TestBed.configureTestingModule({providers: [{provide: SettingsRepository, useValue: {save: () => of({})}}]});
  });
  it('supplies current text on every enqueue-capable call and synchronizes after switching', async () => {
    const model = TestBed.inject(AiModelService);
    const i18n = TestBed.inject(LocalizationService);
    await model.status();
    expect(mockStatus).toHaveBeenLastCalledWith({notificationTitle: 'Hotties AI model',
      notificationDescription: 'Downloading optional category suggestions'});
    await i18n.setLanguage('de');
    const german = {notificationTitle: 'Hotties KI-Modell',
      notificationDescription: 'Optionale Kategorievorschläge werden heruntergeladen'};
    expect(mockLocalize).toHaveBeenLastCalledWith(german);
    await model.status();
    expect(mockStatus).toHaveBeenLastCalledWith(german);
    await model.start(false);
    expect(mockStart).toHaveBeenLastCalledWith({allowCellular: false, ...german});
  });
  it('does not call native notification methods on the web', async () => {
    jest.mocked(Capacitor.getPlatform).mockReturnValue('web');
    const model = TestBed.inject(AiModelService);
    await TestBed.inject(LocalizationService).setLanguage('de');
    expect((await model.status()).state).toBe('missing');
    expect(mockStatus).not.toHaveBeenCalled();
    expect(mockLocalize).not.toHaveBeenCalled();
  });
});
