export const INGREDIENT_SCHEMA_LITERAL = {
  schema: {
    version: 1,
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
    },
    required: ['id', 'recipeId', 'name'],
  },
  migrationStrategies: {
    // v0 ingredients have no link to the shared `items` collection yet;
    // see docs/ITEM-ENTITY-PLAN.md for the planned name-matching backfill.
    1: (oldDoc: any) => {
      oldDoc.itemId = null;
      return oldDoc;
    }
  }
};

