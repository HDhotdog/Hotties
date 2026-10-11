export const SHOPPING_ENTRY_SCHEMA_LITERAL = {
  schema: {
    version: 2, primaryKey: 'id', type: 'object',
    properties: {
      id: {type: 'string', maxLength: 255},
      shoppingListId: {type: 'string'},
      kind: {type: 'string', enum: ['product']},
      targetNodeId: {type: ['string', 'null']},
      label: {type: 'string', minLength: 1},
      needKind: {type: 'string', enum: ['quantity', 'packages', 'unspecified']},
      needAmount: {type: ['number', 'null']},
      needUnit: {type: ['string', 'null']},
      checked: {type: 'boolean'},
      createdAt: {type: 'number'},
      retiredAllocations: {type: 'array', items: {
        type: 'object', additionalProperties: false,
        properties: {
          lotId: {type: 'string'}, amount: {type: 'number', exclusiveMinimum: 0}, unit: {type: 'string'}
        }, required: ['lotId', 'amount', 'unit']
      }},
    },
    required: ['id', 'shoppingListId', 'kind', 'needKind', 'needAmount', 'needUnit', 'checked', 'createdAt', 'retiredAllocations'],
  },
  migrationStrategies: {
    1: (oldDoc: any) => ({...oldDoc, retiredAllocations: []}),
    2: (oldDoc: any) => oldDoc.kind === 'task' ? null : oldDoc
  }
};
