export const DB_METADATA_SCHEMA_LITERAL = {
  schema: {
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
      id: {
        type: 'string',
        maxLength: 255,
      },
      isCreated: {
        type: 'boolean',
        default: false,
      }
    },
    required: ['id', 'isCreated'],
  }
};

