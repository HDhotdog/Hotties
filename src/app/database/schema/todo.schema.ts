import {ItemType} from "../../todo/item-type.enum";
import {AmountUnit} from "../../shared/amount-unit.enum";

export const TODO_SCHEMA_LITERAL = {
  schema: {
    version: 3,
    primaryKey: 'id',
    type: 'object',
    properties: {
      id: {
        type: 'string',
        maxLength: 255,
      },
      categoryId: {
        type: 'string',
        default: '0',
      },
      name: {
        type: 'string',
        minLength: 1,
        maxLength: 255,
        default: 'task name',
      },
      type: {
        type: 'string',
        default: ItemType.FOOD
      },
      amount: {
        type: 'string',
        default: AmountUnit.PIECE
      },
      done: {
        type: 'boolean',
        default: false,
      },
      itemId: {
        type: ['string', 'null'],
        default: null,
      },
      quantity: {
        type: 'number',
        minimum: 1,
        default: 1,
      },
    },
    required: ['id', 'categoryId', 'name', 'type', 'amount', 'done'],
  },
  migrationStrategies: {
    // v0 todos used a color-coded "importance" field; there's no reliable way
    // to reclassify those into food/usable/permanent, so existing todos default
    // to FOOD (the primary use case) with a placeholder amount.
    1: (oldDoc: any) => {
      delete oldDoc.importance;
      oldDoc.type = ItemType.FOOD;
      oldDoc.amount = AmountUnit.PIECE;
      return oldDoc;
    },
    // v1 todos have no link to the shared `items` collection yet;
    // see docs/ITEM-ENTITY-PLAN.md for the name-matching backfill that fills this in.
    2: (oldDoc: any) => {
      oldDoc.itemId = null;
      return oldDoc;
    },
    // v2 todos predate summing up repeated adds into a single row's quantity.
    3: (oldDoc: any) => {
      oldDoc.quantity = 1;
      return oldDoc;
    }
  }
};
