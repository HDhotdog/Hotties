import {createRxDatabase} from 'rxdb';
import {getRxStorageMemory} from 'rxdb/plugins/storage-memory';
import {wrappedValidateAjvStorage} from 'rxdb/plugins/validate-ajv';
import {v4 as uuidv4} from 'uuid';
import {createHottiesDatabase} from './database';
import {CATEGORY_SCHEMA_LITERAL} from './schema/category.schema';

describe('migration readiness', () => {
  // RxDB's upstreamInitialSync() passes a Set of pending writes to Promise.all.
  // Zone.js 0.16.3's UMD build iterates values.length, silently skipping the Set.
  // This reproduces that failure deterministically, without timing or RxDB mocks.
  it('awaits every promise in a Set', async () => {
    let release!: (value: string) => void;
    const pending = new Promise<string>(resolve => { release = resolve; });
    const completed = Promise.all(new Set([pending]));
    release('persisted');
    await expect(completed).resolves.toEqual(['persisted']);
  });
  it.each([true, false])('waits for an asynchronous strategy before returning (legacy: %s)', async legacyMode => {
    const storage = getRxStorageMemory();
    const name = `test-db-${uuidv4()}`;
    const {sortOrder: _sortOrder, ...properties} = CATEGORY_SCHEMA_LITERAL.schema.properties;
    const oldDb = await createRxDatabase({name, storage: wrappedValidateAjvStorage({storage})});
    await oldDb.addCollections({categories: {schema: {...CATEGORY_SCHEMA_LITERAL.schema, version: 0, properties}}});
    await oldDb['categories'].insert({id: 'old-list', name: 'Weekly groceries', saveSuggestions: false});
    await oldDb.close();
    const strategy = CATEGORY_SCHEMA_LITERAL.migrationStrategies[1];
    const spy = jest.spyOn(CATEGORY_SCHEMA_LITERAL.migrationStrategies, 1).mockImplementation(async doc => {
      // Make the pending write visible even on a fast machine. The Set test
      // above is the deterministic reproduction independent of this delay.
      await new Promise(resolve => setTimeout(resolve, 100));
      return strategy(doc);
    });
    try {
      const db = await createHottiesDatabase(storage, name, legacyMode);
      try {
        // Assert the startup contract directly: no polling, retries, or sleeps
        // between initialization and the query.
        expect((await db['categories'].findOne('old-list').exec())?.toJSON()).toMatchObject({
          name: 'Weekly groceries', saveSuggestions: false, sortOrder: 0
        });
        expect(await db['categories'].getMigrationState().getStatus()).toMatchObject({
          status: 'DONE', count: {total: 1, handled: 1, percent: 100}
        });
      } finally {
        await db.close();
      }
    } finally {
      spy.mockRestore();
    }
  });
});
