export interface WeightedBarcode {
  productCode: string;
  grams: number;
}

/** Restricted-circulation codes in this app never belong to the OFF lookup path. */
export function isInternalBarcode(barcode: string): boolean {
  return /^2[0-9]/.test(barcode);
}

export function decodeWeightedBarcode(barcode: string): WeightedBarcode {
  if (!barcode.startsWith('29') || !/^\d{13}$/.test(barcode)) {
    throw new Error('This internal barcode format is not supported yet.');
  }
  const sum = [...barcode.slice(0, 12)].reduce((total, digit, index) =>
    total + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
  if ((10 - sum % 10) % 10 !== Number(barcode[12])) {
    throw new Error('The internal barcode has an invalid check digit.');
  }
  const grams = Number(barcode.slice(7, 12));
  if (grams === 0) throw new Error('The internal barcode has no weight.');
  return {productCode: barcode.slice(2, 7), grams};
}
