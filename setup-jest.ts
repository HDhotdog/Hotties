import {setupZoneTestEnv} from 'jest-preset-angular/setup-env/zone';
import {disableWarnings} from 'rxdb/plugins/dev-mode';
import {webcrypto} from 'node:crypto';
import {registerAppIcons} from './src/app/app-icons';

// jsdom doesn't implement crypto.subtle, which RxDB needs to hash schemas.
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', {value: webcrypto});
}

// jsdom's Blob lacks arrayBuffer()/text(), which RxDB needs to hash attachment data.
if (typeof Blob !== 'undefined' && !Blob.prototype.arrayBuffer) {
  Blob.prototype.arrayBuffer = function (): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(this);
    });
  };
}
if (typeof Blob !== 'undefined' && !Blob.prototype.text) {
  Blob.prototype.text = function (): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(this);
    });
  };
}

// jsdom doesn't implement IntersectionObserver, which ion-picker-column (used by
// the fridge item's expiry-date picker) needs in its componentWillLoad. Ionic
// only uses it to lazily scroll picker columns into view, which doesn't matter
// in tests, so a no-op stub is enough.
if (typeof globalThis.IntersectionObserver === 'undefined') {
  class NoopIntersectionObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }
  Object.defineProperty(globalThis, 'IntersectionObserver', {value: NoopIntersectionObserver});
}

// jsdom's <img> has no real image decoder (no `canvas` npm package installed),
// so assigning a data URL to `.src` never fires `onload`/`onerror` - anything
// that awaits image decoding (e.g. the recipe image cropper) would hang
// forever. Stub a synchronous "decode" so that logic can still be exercised.
if (typeof globalThis.Image !== 'undefined') {
  class StubImage {
    width = 100;
    height = 100;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    private _src = '';
    set src(value: string) {
      this._src = value;
      queueMicrotask(() => this.onload?.());
    }
    get src(): string {
      return this._src;
    }
  }
  Object.defineProperty(globalThis, 'Image', {value: StubImage, writable: true});
}

// jsdom's canvas 2D context isn't implemented without the `canvas` npm
// package (getContext('2d') returns null and logs a "not implemented"
// warning). Stub just enough of the surface for cropImageToSquare().
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue({
    drawImage: () => {},
  }) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.toDataURL = jest
    .fn()
    .mockReturnValue('data:image/jpeg;base64,stub');
}

setupZoneTestEnv();
registerAppIcons();
disableWarnings();
