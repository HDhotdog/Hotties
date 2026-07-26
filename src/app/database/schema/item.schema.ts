import {AmountUnit} from "../../shared/amount-unit.enum";
import {ItemType} from "../../todo/item-type.enum";

export const ITEM_SCHEMA_LITERAL = {
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
      price: {
        type: ['number', 'null'],
        default: null
      },
      unit: {
        type: 'string',
        default: AmountUnit.PIECE
      },
      amount: {
        type: 'number',
        default: 1
      },
      type: {
        type: 'string',
        default: ItemType.FOOD
      },
    },
    required: ['id', 'name', 'unit', 'amount', 'type'],
  },
  migrationStrategies: {
    // v0 items predate the type selector moving here from the todo add bar;
    // default to FOOD, the primary use case.
    1: (oldDoc: any) => {
      oldDoc.type = ItemType.FOOD;
      return oldDoc;
    }
  }
};
