import { Pipe, PipeTransform } from '@angular/core';
import { AmountUnit } from './amount-unit.enum';

/**
 * AmountUnit enum values are persisted data (e.g. 'Stück', 'Pck'), not display
 * text - translating them in place would corrupt stored/compared data. This
 * maps each enum member to a translation key instead, e.g. `{{ unit | amountUnitLabel | translate }}`.
 */
const AMOUNT_UNIT_TRANSLATION_KEYS: Record<AmountUnit, string> = {
  [AmountUnit.PIECE]: 'units.piece',
  [AmountUnit.GRAM]: 'units.gram',
  [AmountUnit.HUNDRED_GRAM]: 'units.hundredGram',
  [AmountUnit.KILOGRAM]: 'units.kilogram',
  [AmountUnit.MILLILITER]: 'units.milliliter',
  [AmountUnit.HUNDRED_MILLILITER]: 'units.hundredMilliliter',
  [AmountUnit.LITER]: 'units.liter',
  [AmountUnit.PACKAGE]: 'units.package',
  [AmountUnit.BUNCH]: 'units.bunch',
  [AmountUnit.PINCH]: 'units.pinch',
};

export function amountUnitTranslationKey(unit: AmountUnit): string {
  return AMOUNT_UNIT_TRANSLATION_KEYS[unit];
}

@Pipe({
  name: 'amountUnitLabel',
  standalone: true,
})
export class AmountUnitLabelPipe implements PipeTransform {
  transform(unit: AmountUnit): string {
    return amountUnitTranslationKey(unit);
  }
}
