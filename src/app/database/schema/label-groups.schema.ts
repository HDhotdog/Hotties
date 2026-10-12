export const LABEL_GROUP_SCHEMA_LITERAL = {
  schema: {
    version: 1,
    primaryKey: 'id',
    type: 'object',
    properties: {
      id: {
        type: 'string',
        maxLength: 255,
      },
      sortOrder: {type: 'integer', minimum: 0, default: 0},
      name: {
        type: 'string',
        minLength: 1,
        maxLength: 255,
        default: 'category name',
      },
    },
    required: ['id', 'name'],
  },
  migrationStrategies: {
    1: (oldDoc: any) => ({...oldDoc, sortOrder: 0})
  }
};

