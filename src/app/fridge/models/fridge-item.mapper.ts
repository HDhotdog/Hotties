import {RxFridgeItem} from '../rxFridgeItem';
import {FridgeItem} from './fridge-item.dto';

export function toFridgeItem(doc: RxFridgeItem): FridgeItem {
  return {
    id: doc.id,
    name: doc.name,
    expiryDate: doc.expiryDate,
    amount: doc.amount,
    quantity: doc.quantity,
    itemId: doc.itemId
  };
}

export function toRxFridgeItem(item: FridgeItem): RxFridgeItem {
  return {
    id: item.id,
    name: item.name,
    expiryDate: item.expiryDate,
    amount: item.amount,
    quantity: item.quantity,
    itemId: item.itemId ?? null
  };
}
