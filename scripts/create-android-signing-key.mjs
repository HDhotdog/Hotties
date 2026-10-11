import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, rmSync, writeFileSync, chmodSync, linkSync, unlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const directory = join(homedir(), '.local/share/hotties/signing');
const keystore = join(directory, 'release.jks');
const credentials = join(directory, 'credentials.env');
const temporaryKeystore = `${keystore}.tmp-${process.pid}-${randomBytes(6).toString('hex')}`;
const alias = 'hotties-release';

mkdirSync(directory, { recursive: true, mode: 0o700 });
chmodSync(directory, 0o700);
if (existsSync(keystore) || existsSync(credentials)) {
  throw new Error('Signing files already exist; refusing to replace the release key.');
}

const storePassword = randomBytes(36).toString('base64url');
const keyPassword = randomBytes(36).toString('base64url');
const keytool = process.env.JAVA_HOME ? join(process.env.JAVA_HOME, 'bin/keytool') : 'keytool';
const environment = {
  ...process.env,
  HOTTIES_STORE_PASSWORD: storePassword,
  HOTTIES_KEY_PASSWORD: keyPassword
};

let createdKeystore = false;
try {
  const result = spawnSync(keytool, [
    '-genkeypair', '-keystore', temporaryKeystore, '-storetype', 'JKS',
    '-storepass:env', 'HOTTIES_STORE_PASSWORD',
    '-keypass:env', 'HOTTIES_KEY_PASSWORD',
    '-alias', alias, '-keyalg', 'RSA', '-keysize', '4096',
    '-validity', '10000', '-dname', 'CN=Hotties Android Release, O=HDhotdog',
    '-noprompt'
  ], { env: environment, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`keytool failed with exit code ${result.status}`);
  linkSync(temporaryKeystore, keystore);
  createdKeystore = true;
  unlinkSync(temporaryKeystore);
  chmodSync(keystore, 0o600);
  writeFileSync(credentials,
    `ANDROID_SIGNING_STORE_PASSWORD=${storePassword}\n` +
    `ANDROID_SIGNING_KEY_ALIAS=${alias}\n` +
    `ANDROID_SIGNING_KEY_PASSWORD=${keyPassword}\n`,
    { flag: 'wx', mode: 0o600 });
} catch (error) {
  rmSync(temporaryKeystore, { force: true });
  if (createdKeystore) rmSync(keystore, { force: true });
  throw error;
}

console.log(`Created ${keystore} and ${credentials}. Back up both files before publishing.`);
