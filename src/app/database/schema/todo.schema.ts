import {ImportanceLevel} from "../../todo/importance-level.enum";

export const TODO_SCHEMA_LITERAL = {
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
      name: {
        type: 'string',
        minLength: 1,
        maxLength: 255,
        default: 'task name',
      },
      importance: {
        type: 'string',
        default: ImportanceLevel.NORMAL
      },
      done: {
        type: 'boolean',
        default: false,
      }
    },
    required: ['id', 'categoryId', 'name', 'importance', 'done'],
  }
};

