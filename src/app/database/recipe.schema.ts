export const RECIPE_SCHEMA_LITERAL = {
  schema: {
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
      id: {
        type: 'string',
        maxLength: 255,
      },
      name: {
        type: 'string',
        minLength: 1,
        maxLength: 255,
        default: 'task name',
      },
      description: {
        type: 'string',
        default: "description",
      },
      preparationTime: {
        type: 'number',
        default: 0
      }
    },
    required: ['id', 'name', 'description', 'preparationTime'],
  }
};

