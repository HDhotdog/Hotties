import {RxItem} from '../rxItem';
import {Item} from './item.dto';

export function toItem(doc: RxItem): Item {
  return {id: doc.id, name: doc.name, price: doc.price, unit: doc.unit, amount: doc.amount, type: doc.type};
}

export function toRxItem(item: Item): RxItem {
  return {id: item.id, name: item.name, price: item.price, unit: item.unit, amount: item.amount, type: item.type};
}
