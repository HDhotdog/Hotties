export const SUGGESTION_SCHEMA_LITERAL = {
  schema: {
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
      id: {
        type: 'string',
        maxLength: 255,
      },
      categoryId: {
        type: 'string',
        default: '0',
      },
      suggestion: {
        type: 'string',
        minLength: 1,
        maxLength: 255,
        default: 'Cookies',
      },
      suffix: {
        type: 'string',
        default: '!'
      }
    },
    required: ['id', 'categoryId', 'suggestion']
  }
};

