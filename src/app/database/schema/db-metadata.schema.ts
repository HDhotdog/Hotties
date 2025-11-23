export const SETTINGS_SCHEMA_LITERAL = {
  schema: {
    version: 0,
    primaryKey: 'key',
    type: 'object',
    properties: {
      key: {type: 'string', maxLength: 255},
      value: {type: 'string'},
    },
    required: ['key', 'value'],
  },
};

