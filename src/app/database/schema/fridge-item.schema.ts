import {AmountUnit} from "../../shared/amount-unit.enum";

export const FRIDGE_ITEM_SCHEMA_LITERAL = {
  schema: {
    version: 0,
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
    },
    required: ['id', 'name', 'amount'],
  }
};
