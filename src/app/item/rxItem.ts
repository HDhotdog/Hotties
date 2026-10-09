import {AmountUnit} from "../shared/amount-unit.enum";
import {ItemType} from "../todo/item-type.enum";

export interface RxItem {
  id: string;
  name: string;
  price: number | null;
  unit: AmountUnit;
  amount: number;
  type: ItemType;
  barcode?: string | null;
  brand?: string | null;
  packageQuantity?: string | null;
}
