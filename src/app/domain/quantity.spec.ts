import {normalizeQuantity, parsePackageQuantity} from './quantity';

describe('physical quantities', () => {
  it('normalizes display units without treating packages as mass or volume', () => {
    expect(normalizeQuantity({amount: 1, unit: 'l'})).toEqual({amount: 1000, unit: 'ml'});
    expect(normalizeQuantity({amount: 0.55, unit: 'kg'})).toEqual({amount: 550, unit: 'g'});
    expect(normalizeQuantity({amount: 1, unit: 'package'})).toEqual({amount: 1, unit: 'package'});
  });

  it('parses simple and multipack labels, leaving ambiguous labels unknown', () => {
    expect(parsePackageQuantity('6 x 100 g')).toEqual({amount: 600, unit: 'g'});
    expect(parsePackageQuantity('1 l')).toEqual({amount: 1000, unit: 'ml'});
    expect(parsePackageQuantity('family carton')).toBeNull();
  });
});
