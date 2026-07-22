import {ItemType} from "./item-type.enum";
import {AmountUnit} from "../shared/amount-unit.enum";

export interface RxToDo {
  id: string;
  categoryId: string;
  name: string;
  type: ItemType;
  amount: AmountUnit;
  done: boolean;
  itemId: string | null;
  quantity: number;
}
