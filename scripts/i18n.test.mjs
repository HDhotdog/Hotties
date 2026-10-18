import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {generate, readLanguagePacks} from './generate-i18n.mjs';

function fixture() {
  const directory = mkdtempSync(path.join(tmpdir(), 'hotties-i18n-'));
  const english = JSON.parse(readFileSync('src/assets/i18n/en.json', 'utf8'));
  const french = structuredClone(english);
  french.meta = {code: 'fr', nativeName: 'Français', locale: 'fr-FR', direction: 'ltr', firstDayOfWeek: 1};
  const write = (code, pack) => writeFileSync(path.join(directory, `${code}.json`), JSON.stringify(pack));
  write('en', english); write('fr', french);
  return {directory, english, french, write};
}
test('a third translation pack is discovered and registered without application edits', () => {
  const {directory} = fixture();
  try {
    const output = path.join(directory, 'languages.ts');
    const packs = generate(directory, output);
    assert.equal(packs.length, 2);
    assert.equal(packs[1].pack.meta.nativeName, 'Français');
    assert.match(readFileSync(output, 'utf8'), /import pack1 from '..\/..\/assets\/i18n\/fr.json'/);
    assert.match(readFileSync(output, 'utf8'), /pack1 as LanguagePack/);
  } finally {rmSync(directory, {recursive: true, force: true});}
});
for (const [name, mutate] of [
  ['missing key', pack => delete pack.messages['ui.settings']],
  ['empty translation', pack => pack.messages['ui.settings'] = ' '],
  ['parameter mismatch', pack => pack.messages['stock.added'] = '{other} added.'],
  ['invalid ICU', pack => pack.messages['format.ingredients'] = '{count, plural, one {one}'],
  ['invalid metadata', pack => pack.meta.direction = 'sideways'],
  ['missing speech vocabulary', pack => delete pack.input],
  ['empty count vocabulary', pack => pack.input.countWords = {}],
  ['invalid unit aliases', pack => pack.input.pieceWords = [null]],
  ['invalid name suffix', pack => pack.input.nameSuffixes = [{suffix: '', replacement: ''}]],
]) test(`rejects ${name}`, () => {
  const {directory, french, write} = fixture();
  try {mutate(french); write('fr', french); assert.throws(() => readLanguagePacks(directory));}
  finally {rmSync(directory, {recursive: true, force: true});}
});
