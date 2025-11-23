export const INGREDIENT_SCHEMA_LITERAL = {
  schema: {
    version: 0,
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
    },
    required: ['id', 'recipeId', 'name'],
  }
};

