import {setupZoneTestEnv} from 'jest-preset-angular/setup-env/zone';
import {disableWarnings} from 'rxdb/plugins/dev-mode';
import {webcrypto} from 'node:crypto';

// jsdom doesn't implement crypto.subtle, which RxDB needs to hash schemas.
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', {value: webcrypto});
}

setupZoneTestEnv();
disableWarnings();
