export const STOCK_LOT_SCHEMA_LITERAL = {
  schema: {
    version: 0, primaryKey: 'id', type: 'object',
    properties: {
      id: {type: 'string', maxLength: 255},
      productId: {type: 'string'},
      acquiredPackages: {type: 'number', minimum: 0},
      acquiredAmount: {type: 'number', exclusiveMinimum: 0},
      acquiredUnit: {type: 'string'},
      remainingAmount: {type: 'number', minimum: 0},
      expiryDate: {type: ['string', 'null']},
      allocations: {type: 'array', items: {type: 'object', properties: {
        shoppingEntryId: {type: 'string'}, amount: {type: 'number', exclusiveMinimum: 0}, unit: {type: 'string'},
      }, required: ['shoppingEntryId', 'amount', 'unit']}},
      createdAt: {type: 'number'},
    },
    required: ['id', 'productId', 'acquiredPackages', 'acquiredAmount', 'acquiredUnit', 'remainingAmount', 'expiryDate', 'allocations', 'createdAt'],
  }
};
