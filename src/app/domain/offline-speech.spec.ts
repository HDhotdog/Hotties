import {Capacitor} from '@capacitor/core';
import {OfflineSpeech} from './offline-speech';
const mockAvailable = jest.fn();
const mockListen = jest.fn();
const mockCancel = jest.fn();
jest.mock('@capacitor/core', () => ({
  Capacitor: {getPlatform: jest.fn()},
  registerPlugin: () => ({available: (...args: unknown[]) => mockAvailable(...args),
    listen: (...args: unknown[]) => mockListen(...args), cancel: () => mockCancel()}),
}));

describe('Offline speech language', () => {
  beforeEach(() => {
    jest.mocked(Capacitor.getPlatform).mockReturnValue('android');
    mockAvailable.mockReset().mockResolvedValue({available: true});
    mockListen.mockReset().mockResolvedValue({text: 'Three apples'});
  });
  it.each(['en-GB', 'de-DE'])('passes %s to availability and recognition', async locale => {
    expect(await OfflineSpeech.available(locale)).toBe(true);
    expect(await OfflineSpeech.listen(locale)).toBe('Three apples');
    expect(mockAvailable).toHaveBeenCalledWith({locale});
    expect(mockListen).toHaveBeenCalledWith({locale});
  });
  it('keeps web input available without calling the Android plugin', async () => {
    jest.mocked(Capacitor.getPlatform).mockReturnValue('web');
    expect(await OfflineSpeech.available('de-DE')).toBe(false);
    expect(mockAvailable).not.toHaveBeenCalled();
  });
  it('reports missing language support without starting recognition', async () => {
    mockAvailable.mockResolvedValue({available: false});
    expect(await OfflineSpeech.available('de-DE')).toBe(false);
    expect(mockListen).not.toHaveBeenCalled();
  });
});
