import {AmountUnit} from "../../shared/amount-unit.enum";

/** UI-facing fridge item model, distinct from the RxDB document shape (`RxFridgeItem`). */
export interface FridgeItem {
  id: string;
  name: string;
  expiryDate: string | null;
  amount: AmountUnit;
  quantity: number;
  itemId?: string | null;
}
