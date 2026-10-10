import {Capacitor, registerPlugin} from '@capacitor/core';

interface OfflineSpeechPlugin {
  available(): Promise<{available: boolean}>;
  listen(): Promise<{text: string}>;
  cancel(): Promise<void>;
}

const nativeSpeech = registerPlugin<OfflineSpeechPlugin>('OfflineSpeech');

export class OfflineSpeech {
  public static async available(): Promise<boolean> {
    if (Capacitor.getPlatform() !== 'android') return false;
    return (await nativeSpeech.available()).available;
  }

  public static async listen(): Promise<string> {
    return (await nativeSpeech.listen()).text;
  }

  public static async cancel(): Promise<void> {
    if (Capacitor.getPlatform() === 'android') await nativeSpeech.cancel();
  }
}
