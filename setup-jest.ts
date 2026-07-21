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

setupZoneTestEnv();
disableWarnings();
