import { copyFile, mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

// Derive debug resources from the final release assets, including the legacy
// round icon and both adaptive layers. Android's debug source set overrides
// these resources without changing the release icon or its adaptive geometry.
const mainRes = 'android/app/src/main/res';
const debugRes = 'android/app/src/debug/res';
let invertedIcons = 0;

for (const directory of await readdir(mainRes, { withFileTypes: true })) {
  if (!directory.isDirectory() || !directory.name.startsWith('mipmap-')) continue;
  const sourceDir = join(mainRes, directory.name);
  const targetDir = join(debugRes, directory.name);
  for (const name of await readdir(sourceDir)) {
    if (!/^ic_launcher(?:_round|_foreground|_background)?\.(png|xml)$/.test(name)) continue;
    await mkdir(targetDir, { recursive: true });
    const source = join(sourceDir, name);
    const target = join(targetDir, name);
    if (name.endsWith('.png')) {
      await sharp(source).negate({ alpha: false }).png().toFile(target);
      invertedIcons++;
    } else {
      await copyFile(source, target);
    }
  }
}

if (!invertedIcons) throw new Error('No Android launcher icons found. Run npm run native:assets first.');
console.log(`Generated ${invertedIcons} inverted debug launcher images.`);
