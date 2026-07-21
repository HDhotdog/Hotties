import {AmountUnit} from "../shared/amount-unit.enum";

export interface RxFridgeItem {
  id: string;
  name: string;
  expiryDate: string | null;
  amount: AmountUnit;
  quantity: number;
}
