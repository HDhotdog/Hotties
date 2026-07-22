import {ItemType} from "./item-type.enum";
import {AmountUnit} from "../shared/amount-unit.enum";

/** UI-facing todo model, distinct from the RxDB document shape (`RxToDo`). */
export interface Todo {
  id: string;
  categoryId: string;
  name: string;
  type: ItemType;
  amount: AmountUnit;
  done: boolean;
}
