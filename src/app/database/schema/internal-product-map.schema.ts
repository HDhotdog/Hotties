export const INTERNAL_PRODUCT_MAP_SCHEMA_LITERAL = {
  schema: {
    version: 0, primaryKey: 'id', type: 'object',
    properties: {
      id: {type: 'string', maxLength: 512},
      storeId: {type: 'string'},
      productCode: {type: 'string', pattern: '^\\d{5}$'},
      productId: {type: 'string'},
    },
    required: ['id', 'storeId', 'productCode', 'productId'],
  }
};
