import {dataUrlToBytes, syncHash} from '../attachment-utils';

export const RECIPE_SCHEMA_LITERAL = {
  schema: {
    version: 3,
    primaryKey: 'id',
    type: 'object',
    attachments: {},
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
      steps: {
        type: 'array',
        default: [],
        items: {
          type: 'object',
          properties: {
            id: {type: 'string', minLength: 1, maxLength: 255},
            instructions: {type: 'string'},
            ingredientIds: {type: 'array', uniqueItems: true, items: {type: 'string', maxLength: 255}}
          },
          required: ['id', 'instructions', 'ingredientIds'],
          additionalProperties: false
        }
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
    },
    // Keep the existing attachment digest format. Async migration strategies
    // are supported; the former early-DONE race came from Jest's Zone.js UMD
    // Promise.all(Set) implementation, not from the migration strategy.
    2: (oldDoc: any) => {
      const imgSrc: string = oldDoc.imgSrc ?? '';
      delete oldDoc.imgSrc;

      if (imgSrc) {
        const {bytes, mime} = dataUrlToBytes(imgSrc);
        oldDoc._attachments = {
          image: {
            type: mime,
            data: new Blob([bytes as BlobPart], {type: mime}),
            length: bytes.length,
            digest: syncHash(bytes)
          }
        };
      }

      return oldDoc;
    },
    3: (oldDoc: any) => {
      oldDoc.steps = [];
      return oldDoc;
    }
  }
};
