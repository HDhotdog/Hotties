import {AmountUnit} from '../../shared/amount-unit.enum';

export const INGREDIENT_SCHEMA_LITERAL = {
  schema: {
    version: 2,
    primaryKey: 'id',
    type: 'object',
    properties: {
      id: {
        type: 'string',
        maxLength: 255,
      },
      recipeId: {
        type: 'string',
        maxLength: 255,
      },
      name: {
        type: 'string',
        minLength: 1,
        maxLength: 255,
        default: 'ingredient',
      },
      itemId: {
        type: ['string', 'null'],
        default: null,
      },
      amount: {
        type: 'number',
        default: 1,
      },
      unit: {
        type: 'string',
        default: AmountUnit.PIECE,
      },
    },
    required: ['id', 'recipeId', 'name', 'amount', 'unit'],
  },
  migrationStrategies: {
    // v0 ingredients have no link to the shared `items` collection yet;
    // see docs/ITEM-ENTITY-PLAN.md for the planned name-matching backfill.
    1: (oldDoc: any) => {
      oldDoc.itemId = null;
      return oldDoc;
    },
    // v1 ingredients predate per-ingredient amounts (recipes just listed
    // names) - default to 1 of the generic PIECE unit for existing rows.
    2: (oldDoc: any) => {
      oldDoc.amount = 1;
      oldDoc.unit = AmountUnit.PIECE;
      return oldDoc;
    },
  }
};

