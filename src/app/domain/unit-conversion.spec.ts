import {blankClass, CatalogNode} from './catalog.model';
import {convertQuantity, effectiveConversions} from './unit-conversion';

describe('catalog unit conversions', () => {
  it('converts approximate units in either direction within mass or volume', () => {
    const conversions = {pinch: {amount: 1, unit: 'g' as const}, bunch: {amount: 250, unit: 'g' as const},
      piece: {amount: 20, unit: 'ml' as const}};
    expect(convertQuantity({amount: 100, unit: 'g'}, 'pinch', conversions)).toBe(100);
    expect(convertQuantity({amount: 2, unit: 'bunch'}, 'g', conversions)).toBe(500);
    expect(convertQuantity({amount: 500, unit: 'g'}, 'bunch', conversions)).toBe(2);
    expect(convertQuantity({amount: 40, unit: 'ml'}, 'piece', conversions)).toBe(2);
    expect(convertQuantity({amount: 1, unit: 'piece'}, 'g', conversions)).toBeNull();
    expect(convertQuantity({amount: 1, unit: 'package'}, 'g', conversions)).toBeNull();
  });

  it('merges inherited units while a product overrides one of them', () => {
    const food = blankClass('food', 'Food', null);
    const spices = {...blankClass('spices', 'Spices', food.id),
      unitConversions: {pinch: {amount: 1, unit: 'g' as const}, piece: {amount: 5, unit: 'g' as const}}};
    const salt: CatalogNode = {...blankClass('salt', 'Salt', spices.id), kind: 'product',
      unitConversions: {piece: {amount: 20, unit: 'g'}}};
    expect(effectiveConversions(salt, [food, spices, salt])).toEqual({
      pinch: {amount: 1, unit: 'g'}, piece: {amount: 20, unit: 'g'}
    });
  });
});
