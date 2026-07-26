import {ItemType} from "./item-type.enum";

/** Shared so the item's type selector and the todo list's row indicator stay visually consistent. */
export const ITEM_TYPE_COLORS: { [key in ItemType]: string } = {
  [ItemType.FOOD]: '#2e7d32',
  [ItemType.USABLE]: '#e6a400',
  [ItemType.PERMANENT]: '#546e7a',
};
