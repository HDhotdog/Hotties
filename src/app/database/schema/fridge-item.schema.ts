import {AmountUnit} from "../../shared/amount-unit.enum";

export const FRIDGE_ITEM_SCHEMA_LITERAL = {
  schema: {
    version: 2,
    primaryKey: 'id',
    type: 'object',
    properties: {
      id: {
        type: 'string',
        maxLength: 255,
      },
      name: {
        type: 'string',
        minLength: 1,
        maxLength: 255,
        default: 'item name',
      },
      expiryDate: {
        type: ['string', 'null'],
        default: null
      },
      amount: {
        type: 'string',
        default: AmountUnit.PIECE
      },
      quantity: {
        type: 'number',
        minimum: 0,
        maximum: 999,
        default: 1
      },
      itemId: {
        type: ['string', 'null'],
        default: null,
      },
    },
    required: ['id', 'name', 'amount', 'quantity'],
  },
  migrationStrategies: {
    1: (oldDoc: any) => {
      oldDoc.quantity = 1;
      return oldDoc;
    },
    // v1 fridge items have no link to the shared `items` collection yet;
    // see docs/ITEM-ENTITY-PLAN.md for the name-matching backfill that fills this in.
    2: (oldDoc: any) => {
      oldDoc.itemId = null;
      return oldDoc;
    }
  }
};
