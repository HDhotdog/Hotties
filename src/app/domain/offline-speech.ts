import {Capacitor, registerPlugin} from '@capacitor/core';

interface OfflineSpeechPlugin {
  available(options: {locale: string}): Promise<{available: boolean}>;
  listen(options: {locale: string}): Promise<{text: string}>;
  cancel(): Promise<void>;
}

const nativeSpeech = registerPlugin<OfflineSpeechPlugin>('OfflineSpeech');

export class OfflineSpeech {
  public static async available(locale = 'en-GB'): Promise<boolean> {
    if (Capacitor.getPlatform() !== 'android') return false;
    return (await nativeSpeech.available({locale})).available;
  }

  public static async listen(locale = 'en-GB'): Promise<string> {
    return (await nativeSpeech.listen({locale})).text;
  }

  public static async cancel(): Promise<void> {
    if (Capacitor.getPlatform() === 'android') await nativeSpeech.cancel();
  }
}
