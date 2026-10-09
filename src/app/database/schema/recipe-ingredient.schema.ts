export const RECIPE_INGREDIENT_SCHEMA_LITERAL = {
  schema: {
    version: 0, primaryKey: 'id', type: 'object',
    properties: {
      id: {type: 'string', maxLength: 255},
      recipeId: {type: 'string'},
      targetNodeId: {type: 'string'},
      name: {type: 'string'},
      amount: {type: 'number', exclusiveMinimum: 0},
      unit: {type: 'string'},
    },
    required: ['id', 'recipeId', 'targetNodeId', 'name', 'amount', 'unit'],
  }
};
