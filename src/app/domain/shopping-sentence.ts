import {QuantityUnit} from './quantity';

export interface ParsedShoppingItem {
  name: string;
  amount: number | null;
  unit: QuantityUnit | null;
}

const UNIT_ALIASES: Record<string, QuantityUnit> = {
  g: 'g', gramm: 'g', kg: 'kg', kilogramm: 'kg', ml: 'ml', milliliter: 'ml',
  l: 'l', liter: 'l', stück: 'piece', stueck: 'piece', piece: 'piece',
  packung: 'package', packungen: 'package', paket: 'package', package: 'package',
  bund: 'bunch', bunch: 'bunch', prise: 'pinch', pinch: 'pinch'
};

export function parseShoppingSentenceResult(raw: string): ParsedShoppingItem[] {
  let value: unknown;
  try {
    value = JSON.parse(raw.trim());
  } catch {
    throw new Error('Could not read the item list. Edit the sentence and try again.');
  }
  if (!Array.isArray(value) || value.length < 1 || value.length > 12) {
    throw new Error('Expected between 1 and 12 shopping items.');
  }
  return value.map((candidate: unknown, index: number) => {
    if (!candidate || typeof candidate !== 'object') throw new Error(`Item ${index + 1} is invalid.`);
    const item = candidate as Record<string, unknown>;
    if (typeof item['name'] !== 'string' || !item['name'].trim() || item['name'].length > 100) {
      throw new Error(`Item ${index + 1} needs a short name.`);
    }
    const amount = item['amount'];
    if (amount !== null && (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0 || amount > 99999)) {
      throw new Error(`Item ${index + 1} has an invalid amount.`);
    }
    const spokenUnit = item['unit'];
    const unit = spokenUnit === null ? null : typeof spokenUnit === 'string' ?
      UNIT_ALIASES[spokenUnit.trim().toLocaleLowerCase('de-DE')] : undefined;
    if (unit === undefined) throw new Error(`Item ${index + 1} has an unknown unit.`);
    return {name: item['name'].trim(), amount: amount as number | null, unit};
  });
}

export function normalizedCatalogName(name: string): string {
  return name.trim().toLocaleLowerCase('de-DE').normalize('NFKC').replace(/\s+/g, ' ');
}
