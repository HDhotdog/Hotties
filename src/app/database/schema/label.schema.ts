export const LABEL_SCHEMA_LITERAL = {
  schema: {
    version: 2,
    primaryKey: 'id',
    type: 'object',
    properties: {
      origin: {type: 'string', enum: ['app', 'user']},
      translationKey: {type: 'string', maxLength: 255},
      id: {
        type: 'string',
        maxLength: 255,
      },
      groupId: {
        type: 'string',
        maxLength: 255,
      },
      recipeId: {
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
    required: ['id', 'groupId', 'recipeId', 'name'],
  },
  migrationStrategies: {
    2: (oldDoc: any) => ({...oldDoc}),
    1: (oldDoc: any) => ({...oldDoc, sortOrder: 0})
  }
};

