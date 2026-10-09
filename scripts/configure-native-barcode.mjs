import { existsSync, readFileSync, writeFileSync } from 'node:fs';

// Native projects are generated locally and gitignored. Apply required scanner
// settings after `cap add` and before every `cap sync`.
const androidVariables = 'android/variables.gradle';
if (existsSync(androidVariables)) {
  const original = readFileSync(androidVariables, 'utf8');
  const updated = original.replace(/minSdkVersion\s*=\s*\d+/, 'minSdkVersion = 26');
  if (updated === original && !/minSdkVersion\s*=\s*26/.test(original)) {
    throw new Error(`Could not set minSdkVersion in ${androidVariables}`);
  }
  writeFileSync(androidVariables, updated);

  const manifestPath = 'android/app/src/main/AndroidManifest.xml';
  if (existsSync(manifestPath)) {
    let manifest = readFileSync(manifestPath, 'utf8');
    for (const permission of ['android.permission.CAMERA', 'android.permission.INTERNET']) {
      if (!manifest.includes(permission)) {
        manifest = manifest.replace(/<manifest\b[^>]*>/, (tag) => `${tag}\n    <uses-permission android:name="${permission}" />`);
      }
    }
    writeFileSync(manifestPath, manifest);
  }
}

const iosInfo = 'ios/App/App/Info.plist';
if (existsSync(iosInfo)) {
  let info = readFileSync(iosInfo, 'utf8');
  if (!info.includes('NSCameraUsageDescription')) {
    info = info.replace(/<\/dict>\s*<\/plist>/,
      '    <key>NSCameraUsageDescription</key>\n    <string>Scan food product barcodes to add them to your fridge.</string>\n</dict>\n</plist>');
    writeFileSync(iosInfo, info);
  }
}
