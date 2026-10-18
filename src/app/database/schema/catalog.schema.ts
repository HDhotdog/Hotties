export const CATALOG_SCHEMA_LITERAL = {
  schema: {
    version: 2, primaryKey: 'id', type: 'object',
    properties: {
      origin: {type: 'string', enum: ['app', 'user']},
      translationKey: {type: 'string', maxLength: 255},
      id: {type: 'string', maxLength: 255},
      parentId: {type: ['string', 'null']},
      kind: {type: 'string', enum: ['class', 'product']},
      name: {type: 'string', minLength: 1, maxLength: 255},
      brand: {type: ['string', 'null']},
      barcodes: {type: 'array', items: {type: 'string'}},
      saleKind: {type: 'string', enum: ['fixed', 'variable', 'unknown']},
      packageAmount: {type: ['number', 'null']},
      packageUnit: {type: ['string', 'null']},
      variableUnit: {type: ['string', 'null']},
      rawPackage: {type: ['string', 'null']},
      unitConversions: {
        type: 'object', default: {}, additionalProperties: false,
        properties: Object.fromEntries(['piece', 'bunch', 'pinch'].map(unit => [unit, {
          type: 'object', additionalProperties: false,
          properties: {amount: {type: 'number', exclusiveMinimum: 0}, unit: {type: 'string', enum: ['g', 'ml']}},
          required: ['amount', 'unit']
        }]))
      },
    },
    required: ['id', 'parentId', 'kind', 'name', 'brand', 'barcodes', 'saleKind', 'packageAmount', 'packageUnit', 'variableUnit', 'rawPackage', 'unitConversions'],
  },
  migrationStrategies: {
    2: (oldDoc: any) => ({...oldDoc}),
    1: (oldDoc: any) => ({...oldDoc, unitConversions: {}})
  }
};
