import {AmountUnit} from "../../shared/amount-unit.enum";
import {ItemType} from "../../todo/item-type.enum";

/** UI-facing item model, distinct from the RxDB document shape (`RxItem`). */
export interface Item {
  id: string;
  name: string;
  price: number | null;
  unit: AmountUnit;
  amount: number;
  type: ItemType;
}
