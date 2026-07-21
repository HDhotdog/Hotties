import {ItemType} from "../../todo/item-type.enum";
import {AmountUnit} from "../../shared/amount-unit.enum";

export const TODO_SCHEMA_LITERAL = {
  schema: {
    version: 1,
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
      }
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
    }
  }
};
