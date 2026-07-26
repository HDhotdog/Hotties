import {AmountUnit} from '../shared/amount-unit.enum';

/** UI-facing ingredient model, distinct from the RxDB document shape (`RxIngredient`). */
export interface Ingredient {
  id: string;
  recipeId: string;
  name: string;
  itemId?: string | null;
  /** How much of `unit` this recipe needs - recipe-specific, independent of the linked item's own package amount. */
  amount: number;
  /** Snapshot of the linked item's unit at the time it was added, so display doesn't need a join. */
  unit: AmountUnit;
}
