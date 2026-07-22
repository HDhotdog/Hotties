import {setupZoneTestEnv} from 'jest-preset-angular/setup-env/zone';
import {disableWarnings} from 'rxdb/plugins/dev-mode';
import {webcrypto} from 'node:crypto';

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

setupZoneTestEnv();
disableWarnings();
