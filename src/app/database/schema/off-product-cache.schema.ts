export const OFF_PRODUCT_CACHE_SCHEMA_LITERAL = {
  schema: {
    version: 0, primaryKey: 'barcode', type: 'object',
    properties: {
      barcode: {type: 'string', maxLength: 14},
      status: {type: 'string', enum: ['found', 'not-found']},
      product: {
        type: ['object', 'null'], properties: {
          barcode: {type: 'string'}, name: {type: 'string'},
          brand: {type: ['string', 'null']}, packageQuantity: {type: ['string', 'null']},
        }, required: ['barcode', 'name', 'brand', 'packageQuantity']
      },
      fetchedAt: {type: 'number'},
      reviewedAt: {type: ['number', 'null']},
    },
    required: ['barcode', 'status', 'product', 'fetchedAt', 'reviewedAt'],
  }
};
