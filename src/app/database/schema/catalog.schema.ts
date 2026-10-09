export const CATALOG_SCHEMA_LITERAL = {
  schema: {
    version: 0, primaryKey: 'id', type: 'object',
    properties: {
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
    },
    required: ['id', 'parentId', 'kind', 'name', 'brand', 'barcodes', 'saleKind', 'packageAmount', 'packageUnit', 'variableUnit', 'rawPackage'],
  }
};
