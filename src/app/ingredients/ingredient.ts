import {AmountUnit} from '../shared/amount-unit.enum';

export interface RxIngredient {
  id: string;
  recipeId: string;
  name: string;
  itemId: string | null;
  amount: number;
  unit: AmountUnit;
}
