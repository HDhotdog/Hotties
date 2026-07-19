export const RECIPE_SCHEMA_LITERAL = {
  schema: {
    version: 1,
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
      },
      imgSrc: {
        type: 'string',
        default: ''
      },
      emoji: {
        type: ['string', 'null'],
        default: null
      }
    },
    required: ['id', 'name', 'description', 'preparationTime'],
  },
  migrationStrategies: {
    1: (oldDoc: any) => {
      oldDoc.imgSrc = oldDoc.imgSrc ?? '';
      oldDoc.emoji = oldDoc.emoji ?? null;
      return oldDoc;
    }
  }
};
