import {RxDatabase} from "rxdb";
import {getRxStorageMemory} from "rxdb/plugins/storage-memory";
import {v4 as uuidv4} from 'uuid';
import {createHottiesDatabase} from "../database";

/** A minimal stand-in for DatabaseService that repositories accept structurally. */
export interface TestDatabaseAccessor {
  getDb(): Promise<RxDatabase>;
}

/**
 * Creates a fresh, seeded, in-memory RxDatabase for tests (no IndexedDB/Dexie involved).
 * Each call gets its own uniquely-named database so tests don't leak state into each other.
 */
export async function createTestDatabase(): Promise<{ db: RxDatabase; accessor: TestDatabaseAccessor }> {
  const db = await createHottiesDatabase(getRxStorageMemory(), `test-db-${uuidv4()}`);
  return {db, accessor: {getDb: async () => db}};
}
