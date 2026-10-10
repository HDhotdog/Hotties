export const SHOPPING_ENTRY_SCHEMA_LITERAL = {
  schema: {
    version: 0, primaryKey: 'id', type: 'object',
    properties: {
      id: {type: 'string', maxLength: 255},
      shoppingListId: {type: 'string'},
      kind: {type: 'string', enum: ['product', 'task']},
      targetNodeId: {type: ['string', 'null']},
      label: {type: 'string', minLength: 1},
      needKind: {type: 'string', enum: ['quantity', 'packages', 'unspecified']},
      needAmount: {type: ['number', 'null']},
      needUnit: {type: ['string', 'null']},
      checked: {type: 'boolean'},
      createdAt: {type: 'number'},
    },
    required: ['id', 'shoppingListId', 'kind', 'needKind', 'needAmount', 'needUnit', 'checked', 'createdAt'],
  },
};
