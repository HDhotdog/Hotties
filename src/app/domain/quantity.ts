export type QuantityUnit = 'g' | 'kg' | 'ml' | 'l' | 'piece' | 'package' | 'bunch' | 'pinch';
export type BaseUnit = 'g' | 'ml' | 'piece' | 'package' | 'bunch' | 'pinch';

export interface Quantity {
  amount: number;
  unit: QuantityUnit;
}

export interface BaseQuantity {
  amount: number;
  unit: BaseUnit;
}

export function normalizeQuantity(quantity: Quantity): BaseQuantity {
  if (!Number.isFinite(quantity.amount) || quantity.amount <= 0) {
    throw new Error('Quantity must be greater than zero.');
  }
  if (quantity.unit === 'kg') return {amount: quantity.amount * 1000, unit: 'g'};
  if (quantity.unit === 'l') return {amount: quantity.amount * 1000, unit: 'ml'};
  return {amount: quantity.amount, unit: quantity.unit};
}

export function sameDimension(a: BaseUnit, b: BaseUnit): boolean {
  return a === b;
}

export function formatQuantity(quantity: BaseQuantity): string {
  return `${Number(quantity.amount.toFixed(3))} ${quantity.unit}`;
}

/** A best-effort parser. An unrecognized label remains unknown, never one package of a guessed size. */
export function parsePackageQuantity(raw: string | null): BaseQuantity | null {
  if (!raw) return null;
  const match = raw.trim().match(/^(?:(\d+)\s*[x×]\s*)?(\d+(?:[.,]\d+)?)\s*(kg|g|ml|l|pcs?|pieces?)\b/i);
  if (!match) return null;
  const unit = /^pcs?|pieces?$/i.test(match[3]) ? 'piece' : match[3].toLowerCase() as QuantityUnit;
  return normalizeQuantity({amount: Number(match[1] ?? 1) * Number(match[2].replace(',', '.')), unit});
}
