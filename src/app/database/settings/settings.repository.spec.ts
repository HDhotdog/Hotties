import {firstValueFrom} from 'rxjs';
import {RxDatabase} from 'rxdb';
import {createTestDatabase} from '../test-support/create-test-database';
import {DatabaseService} from '../database';
import {SettingsRepository} from './settings.repository';

describe('SettingsRepository (integration, in-memory RxDB)', () => {
  let db: RxDatabase;
  let repository: SettingsRepository;

  beforeEach(async () => {
    const testDb = await createTestDatabase();
    db = testDb.db;
    repository = new SettingsRepository(testDb.accessor as unknown as DatabaseService);
  });

  afterEach(async () => {
    await db.close();
  });

  it('findByKey() returns null for a key that was never saved', async () => {
    const result = await firstValueFrom(repository.findByKey('never-saved'));
    expect(result).toBeNull();
  });

  it('findByKey() returns the saved value once saved', async () => {
    await firstValueFrom(repository.save({key: 'selectedCategoryId', value: 'cat-1'}));

    const result = await firstValueFrom(repository.findByKey('selectedCategoryId'));

    expect(result).toMatchObject({key: 'selectedCategoryId', value: 'cat-1'});
  });

  it('findByKey() does not error even though findById() would (unlike the base findById)', async () => {
    // The seeded database already sets the "dbSeeded" key; a missing key must resolve to null, not throw.
    await expect(firstValueFrom(repository.findByKey('missing'))).resolves.toBeNull();
  });
});
