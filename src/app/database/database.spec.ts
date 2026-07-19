import {RxDatabase} from 'rxdb';
import {getRxStorageMemory} from 'rxdb/plugins/storage-memory';
import {v4 as uuidv4} from 'uuid';
import {createHottiesDatabase} from './database';

describe('createHottiesDatabase() seeding', () => {
  let db: RxDatabase;

  afterEach(async () => {
    if (db) {
      await db.close();
    }
  });

  it('creates all expected collections', async () => {
    db = await createHottiesDatabase(getRxStorageMemory(), `test-db-${uuidv4()}`);

    expect(Object.keys(db.collections).sort()).toEqual([
      'categories', 'ingredients', 'label_groups', 'labels', 'recipes', 'settings', 'suggestions', 'todos'
    ]);
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
