import {AmountUnit} from "../../shared/amount-unit.enum";

export const FRIDGE_ITEM_SCHEMA_LITERAL = {
  schema: {
    version: 1,
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
    },
    required: ['id', 'name', 'amount', 'quantity'],
  },
  migrationStrategies: {
    1: (oldDoc: any) => {
      oldDoc.quantity = 1;
      return oldDoc;
    }
  }
};
