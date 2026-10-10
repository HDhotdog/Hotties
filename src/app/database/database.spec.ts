import {createRxDatabase, RxDatabase} from 'rxdb';
import {getRxStorageMemory} from 'rxdb/plugins/storage-memory';
import {wrappedValidateAjvStorage} from 'rxdb/plugins/validate-ajv';
import {v4 as uuidv4} from 'uuid';
import {createHottiesDatabase} from './database';
import {CATALOG_SCHEMA_LITERAL} from './schema/catalog.schema';
import {SHOPPING_ENTRY_SCHEMA_LITERAL} from './schema/shopping-entry.schema';

describe('createHottiesDatabase() seeding', () => {
  let db: RxDatabase;

  afterEach(async () => {
    if (db) {
      await db.close();
    }
  });

  it('creates the legacy collections for migration tests', async () => {
    db = await createHottiesDatabase(getRxStorageMemory(), `test-db-${uuidv4()}`);

    expect(Object.keys(db.collections).sort()).toEqual([
      'catalog_nodes', 'categories', 'fridge_items', 'ingredients', 'items', 'label_groups', 'labels',
      'recipes', 'settings', 'suggestions', 'todos'
    ].sort());
  });

  it('creates only the active entity collections for the app', async () => {
    db = await createHottiesDatabase(getRxStorageMemory(), `test-db-${uuidv4()}`, false);
    expect(Object.keys(db.collections).sort()).toEqual([
      'catalog_nodes', 'categories', 'label_groups', 'labels', 'recipe_ingredients', 'recipes',
      'settings', 'shopping_entries', 'stock_lots', 'suggestions', 'off_product_cache', 'internal_product_map'
    ].sort());
  });

  it('keeps catalog and stock records after reopening the new database', async () => {
    const storage = getRxStorageMemory();
    const name = `test-db-${uuidv4()}`;
    db = await createHottiesDatabase(storage, name, false);
    await db['catalog_nodes'].upsert({
      id: 'milk', parentId: 'root-food', kind: 'class', name: 'Milk',
      brand: null, barcodes: [], saleKind: 'unknown', packageAmount: null, packageUnit: null,
      variableUnit: null, rawPackage: null
    });
    await db['catalog_nodes'].upsert({
      id: 'carton', parentId: 'milk', kind: 'product', name: 'Milk carton',
      brand: null, barcodes: ['1234567890123'], saleKind: 'fixed', packageAmount: 1000,
      packageUnit: 'ml', variableUnit: null, rawPackage: '1 l'
    });
    await db['stock_lots'].upsert({
      id: 'lot', productId: 'carton', acquiredPackages: 1,
      acquiredAmount: 1000, acquiredUnit: 'ml', remainingAmount: 550, expiryDate: null,
      allocations: [], createdAt: 1
    });
    await db.close();
    db = await createHottiesDatabase(storage, name, false);
    expect((await db['catalog_nodes'].findOne('carton').exec())?.toJSON()).toMatchObject({parentId: 'milk'});
    expect((await db['stock_lots'].findOne('lot').exec())?.toJSON()).toMatchObject({remainingAmount: 550});
  });

  it('seeds exactly one default "Edeka" category on first init', async () => {
    db = await createHottiesDatabase(getRxStorageMemory(), `test-db-${uuidv4()}`);

    const categories = await db['categories'].find().exec();
    expect(categories).toHaveLength(1);
    expect(categories[0].toJSON()).toMatchObject({name: 'Edeka', saveSuggestions: true});
  });

  it('seeds two label groups ("Art", "Geschmack") with 4 labels each', async () => {
    db = await createHottiesDatabase(getRxStorageMemory(), `test-db-${uuidv4()}`);

    const groups = await db['label_groups'].find().exec();
    const labels = await db['labels'].find().exec();

    expect(groups.map(g => g.toJSON().name).sort()).toEqual(['Art', 'Geschmack']);
    expect(labels).toHaveLength(8);
    // every seeded label is a template label, not assigned to any recipe
    expect(labels.every(l => l.toJSON().recipeId === '')).toBe(true);
  });

  it('marks the database as seeded via the "dbSeeded" settings flag', async () => {
    db = await createHottiesDatabase(getRxStorageMemory(), `test-db-${uuidv4()}`);

    const seededFlag = await db['settings'].findOne('dbSeeded').exec();
    expect(seededFlag?.toJSON().value).toBe('true');
  });

  it('does not re-seed a database that already has the "dbSeeded" flag set', async () => {
    const dbName = `test-db-${uuidv4()}`;
    const storage = getRxStorageMemory();

    db = await createHottiesDatabase(storage, dbName);
    await db.close();

    // re-opening the same underlying storage: since it's already marked as seeded,
    // seedInitialData() must bail out instead of inserting a second "Edeka" category
    db = await createHottiesDatabase(storage, dbName);

    const categories = await db['categories'].find().exec();
    expect(categories).toHaveLength(1);
  });
});

describe('catalog schema migration (v0 -> v1, unit conversions)', () => {
  it('preserves an existing catalog node and gives it an empty conversion map', async () => {
    const dbName = `test-db-${uuidv4()}`;
    const storage = getRxStorageMemory();
    const properties = {...CATALOG_SCHEMA_LITERAL.schema.properties};
    delete (properties as any).unitConversions;
    const oldDb = await createRxDatabase({name: dbName, storage: wrappedValidateAjvStorage({storage})});
    await oldDb.addCollections({catalog_nodes: {schema: {
      ...CATALOG_SCHEMA_LITERAL.schema, version: 0, properties,
      required: CATALOG_SCHEMA_LITERAL.schema.required.filter(field => field !== 'unitConversions')
    }}});
    await oldDb['catalog_nodes'].upsert({
      id: 'salt', parentId: 'root-food', kind: 'product', name: 'Salt', brand: null,
      barcodes: [], saleKind: 'fixed', packageAmount: 100, packageUnit: 'g',
      variableUnit: null, rawPackage: null
    });
    await oldDb.close();

    const db = await createHottiesDatabase(storage, dbName, false);
    try {
      expect((await db['catalog_nodes'].findOne('salt').exec())?.toJSON())
        .toMatchObject({name: 'Salt', packageAmount: 100, unitConversions: {}});
    } finally {
      await db.close();
    }
  });
});

describe('shopping entry schema migration (v0 -> v1, retired allocations)', () => {
  it('preserves an existing need and starts with no retired allocations', async () => {
    const dbName = `test-db-${uuidv4()}`;
    const storage = getRxStorageMemory();
    const properties = {...SHOPPING_ENTRY_SCHEMA_LITERAL.schema.properties};
    delete (properties as any).retiredAllocations;
    const oldDb = await createRxDatabase({name: dbName, storage: wrappedValidateAjvStorage({storage})});
    await oldDb.addCollections({shopping_entries: {schema: {
      ...SHOPPING_ENTRY_SCHEMA_LITERAL.schema, version: 0, properties,
      required: SHOPPING_ENTRY_SCHEMA_LITERAL.schema.required.filter(field => field !== 'retiredAllocations')
    }}});
    await oldDb['shopping_entries'].upsert({
      id: 'need', shoppingListId: 'list', kind: 'product', targetNodeId: 'salt', label: 'Salt',
      needKind: 'quantity', needAmount: 200, needUnit: 'g', checked: false, createdAt: 1
    });
    await oldDb.close();
    const db = await createHottiesDatabase(storage, dbName, false);
    try {
      expect((await db['shopping_entries'].findOne('need').exec())?.toJSON())
        .toMatchObject({needAmount: 200, retiredAllocations: []});
    } finally {
      await db.close();
    }
  });
});

describe('recipe schema migration (v0 -> v1, imgSrc/emoji)', () => {
  let db: RxDatabase;

  afterEach(async () => {
    if (db) {
      await db.close();
    }
  });

  it('migrates a pre-existing v0 recipe document to v1 with default imgSrc/emoji', async () => {
    const dbName = `test-db-${uuidv4()}`;
    const storage = getRxStorageMemory();

    // Simulate an existing install on the old (pre-imgSrc/emoji) recipe schema.
    const oldDb = await createRxDatabase({name: dbName, storage: wrappedValidateAjvStorage({storage})});
    await oldDb.addCollections({
      recipes: {
        schema: {
          version: 0,
          primaryKey: 'id',
          type: 'object',
          properties: {
            id: {type: 'string', maxLength: 255},
            name: {type: 'string', minLength: 1, maxLength: 255},
            description: {type: 'string'},
            preparationTime: {type: 'number'}
          },
          required: ['id', 'name', 'description', 'preparationTime']
        }
      }
    });
    await oldDb['recipes'].upsert({id: 'r1', name: 'Pancakes', description: 'Fluffy', preparationTime: 20});
    await oldDb.close();

    // Re-open with the current (v1) schema against the same underlying storage.
    db = await createHottiesDatabase(storage, dbName);

    const migrated = await db['recipes'].findOne('r1').exec();
    expect(migrated?.toJSON()).toMatchObject({
      id: 'r1',
      name: 'Pancakes',
      description: 'Fluffy',
      preparationTime: 20,
      emoji: null
    });
    expect(migrated?.toJSON().imgSrc).toBeUndefined();
  });
});

describe('recipe schema migration (v1 -> v2, imgSrc to attachment)', () => {
  let db: RxDatabase;

  // A 1x1 transparent PNG.
  const TINY_PNG_BASE64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

  afterEach(async () => {
    if (db) {
      await db.close();
    }
  });

  it('converts an existing imgSrc data URL into an "image" attachment and drops the field', async () => {
    const dbName = `test-db-${uuidv4()}`;
    const storage = getRxStorageMemory();

    const oldDb = await createRxDatabase({name: dbName, storage: wrappedValidateAjvStorage({storage})});
    await oldDb.addCollections({
      recipes: {
        schema: {
          version: 1,
          primaryKey: 'id',
          type: 'object',
          properties: {
            id: {type: 'string', maxLength: 255},
            name: {type: 'string', minLength: 1, maxLength: 255},
            description: {type: 'string'},
            preparationTime: {type: 'number'},
            imgSrc: {type: 'string'},
            emoji: {type: ['string', 'null']}
          },
          required: ['id', 'name', 'description', 'preparationTime']
        },
        migrationStrategies: {
          1: (oldDoc: any) => oldDoc
        }
      }
    });
    await oldDb['recipes'].upsert({
      id: 'r1',
      name: 'Pancakes',
      description: 'Fluffy',
      preparationTime: 20,
      imgSrc: `data:image/png;base64,${TINY_PNG_BASE64}`,
      emoji: null
    });
    await oldDb.close();

    db = await createHottiesDatabase(storage, dbName);

    const migrated = await db['recipes'].findOne('r1').exec();
    expect(migrated?.toJSON().imgSrc).toBeUndefined();

    const attachment = migrated?.getAttachment('image');
    expect(attachment).toBeTruthy();
    expect(attachment?.type).toBe('image/png');
    expect(await attachment?.getDataBase64()).toBe(TINY_PNG_BASE64);
  });

  it('creates no attachment when imgSrc was empty', async () => {
    const dbName = `test-db-${uuidv4()}`;
    const storage = getRxStorageMemory();

    const oldDb = await createRxDatabase({name: dbName, storage: wrappedValidateAjvStorage({storage})});
    await oldDb.addCollections({
      recipes: {
        schema: {
          version: 1,
          primaryKey: 'id',
          type: 'object',
          properties: {
            id: {type: 'string', maxLength: 255},
            name: {type: 'string', minLength: 1, maxLength: 255},
            description: {type: 'string'},
            preparationTime: {type: 'number'},
            imgSrc: {type: 'string'},
            emoji: {type: ['string', 'null']}
          },
          required: ['id', 'name', 'description', 'preparationTime']
        },
        migrationStrategies: {
          1: (oldDoc: any) => oldDoc
        }
      }
    });
    await oldDb['recipes'].upsert({
      id: 'r2',
      name: 'Toast',
      description: 'Simple',
      preparationTime: 5,
      imgSrc: '',
      emoji: null
    });
    await oldDb.close();

    db = await createHottiesDatabase(storage, dbName);

    const migrated = await db['recipes'].findOne('r2').exec();
    expect(migrated?.toJSON().imgSrc).toBeUndefined();
    expect(migrated?.getAttachment('image')).toBeNull();
  });
});

describe('todo schema migration (v0 -> v1, importance to type/amount)', () => {
  let db: RxDatabase;

  afterEach(async () => {
    if (db) {
      await db.close();
    }
  });

  it('migrates a pre-existing v0 todo (color-coded "importance") to v1 defaulting to FOOD/PIECE', async () => {
    const dbName = `test-db-${uuidv4()}`;
    const storage = getRxStorageMemory();

    // Simulate an existing install on the old (pre-type/amount) todo schema.
    const oldDb = await createRxDatabase({name: dbName, storage: wrappedValidateAjvStorage({storage})});
    await oldDb.addCollections({
      todos: {
        schema: {
          version: 0,
          primaryKey: 'id',
          type: 'object',
          properties: {
            id: {type: 'string', maxLength: 255},
            categoryId: {type: 'string'},
            name: {type: 'string', minLength: 1, maxLength: 255},
            importance: {type: 'string'},
            done: {type: 'boolean'}
          },
          required: ['id', 'categoryId', 'name', 'importance', 'done']
        }
      }
    });
    await oldDb['todos'].upsert({id: 't1', categoryId: 'cat-1', name: 'Milk', importance: '#CC0000', done: false});
    await oldDb.close();

    // Re-open with the current (v1) schema against the same underlying storage.
    db = await createHottiesDatabase(storage, dbName);

    const migrated = await db['todos'].findOne('t1').exec();
    expect(migrated?.toJSON()).toMatchObject({
      id: 't1',
      categoryId: 'cat-1',
      name: 'Milk',
      type: 'food',
      amount: 'Stück',
      done: false
    });
    expect(migrated?.toJSON().importance).toBeUndefined();
  });
});

describe('fridge item schema migration (v0 -> v1, adding quantity)', () => {
  let db: RxDatabase;

  afterEach(async () => {
    if (db) {
      await db.close();
    }
  });

  it('migrates a pre-existing v0 fridge item (no quantity) to v1 defaulting to quantity 1', async () => {
    const dbName = `test-db-${uuidv4()}`;
    const storage = getRxStorageMemory();

    // Simulate an existing install on the old (pre-quantity) fridge item schema.
    const oldDb = await createRxDatabase({name: dbName, storage: wrappedValidateAjvStorage({storage})});
    await oldDb.addCollections({
      fridge_items: {
        schema: {
          version: 0,
          primaryKey: 'id',
          type: 'object',
          properties: {
            id: {type: 'string', maxLength: 255},
            name: {type: 'string', minLength: 1, maxLength: 255},
            expiryDate: {type: ['string', 'null']},
            amount: {type: 'string'}
          },
          required: ['id', 'name', 'amount']
        }
      }
    });
    await oldDb['fridge_items'].upsert({id: 'f1', name: 'Milk', expiryDate: null, amount: 'l'});
    await oldDb.close();

    // Re-open with the current (v1) schema against the same underlying storage.
    db = await createHottiesDatabase(storage, dbName);

    const migrated = await db['fridge_items'].findOne('f1').exec();
    expect(migrated?.toJSON()).toMatchObject({
      id: 'f1',
      name: 'Milk',
      amount: 'l',
      quantity: 1
    });
  });
});

describe('item schema migration (v1 -> v2, barcode metadata)', () => {
  let db: RxDatabase;

  afterEach(async () => {
    if (db) await db.close();
  });

  it('keeps existing items and initializes barcode metadata', async () => {
    const dbName = `test-db-${uuidv4()}`;
    const storage = getRxStorageMemory();
    const oldDb = await createRxDatabase({name: dbName, storage: wrappedValidateAjvStorage({storage})});
    await oldDb.addCollections({
      items: {
        schema: {
          version: 1, primaryKey: 'id', type: 'object',
          properties: {
            id: {type: 'string', maxLength: 255},
            name: {type: 'string', minLength: 1, maxLength: 255},
            price: {type: ['number', 'null']},
            unit: {type: 'string'},
            amount: {type: 'number'},
            type: {type: 'string'},
          },
          required: ['id', 'name', 'unit', 'amount', 'type'],
        },
        migrationStrategies: {1: (oldDoc: any) => oldDoc},
      },
    });
    await oldDb['items'].upsert({id: 'i1', name: 'Milk', price: null, unit: 'Stück', amount: 1, type: 'food'});
    await oldDb.close();

    db = await createHottiesDatabase(storage, dbName);
    const migrated = await db['items'].findOne('i1').exec();
    expect(migrated?.toJSON()).toMatchObject({
      id: 'i1', name: 'Milk', barcode: null, brand: null, packageQuantity: null,
    });
  });
});
