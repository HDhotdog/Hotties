import {Injectable} from '@angular/core';
import {Capacitor, registerPlugin} from '@capacitor/core';
import {ParsedShoppingItem, parseShoppingSentenceResult} from './shopping-sentence';

interface LocalShoppingModelPlugin {
  prepare(): Promise<{ loadMs: number }>;

  generate(options: { text: string }): Promise<{ text: string }>;

  cancel(): Promise<void>;
}

const nativeModel = registerPlugin<LocalShoppingModelPlugin>('LocalShoppingModel');

@Injectable({providedIn: 'root'})
export class ShoppingSentenceService {
  public warmUp(): void {
    if (Capacitor.getPlatform() === 'android') void nativeModel.prepare().catch(() => undefined);
  }

  public async parse(text: string): Promise<ParsedShoppingItem[]> {
    if (!text.trim()) throw new Error('Enter or say some shopping items.');
    if (Capacitor.getPlatform() !== 'android') throw new Error('Local sentence parsing is available on Android. Edit the items below.');
    const result = await nativeModel.generate({text: text.trim()});
    return parseShoppingSentenceResult(result.text);
  }

  public cancel(): void {
    if (Capacitor.getPlatform() === 'android') void nativeModel.cancel().catch(() => undefined);
  }
}
