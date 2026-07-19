import {firstValueFrom} from 'rxjs';
import {RxDatabase} from 'rxdb';
import {createTestDatabase} from '../database/test-support/create-test-database';
import {DatabaseService} from '../database/database';
import {LabelGroupRepository} from './label-group.repository';
import {RxLabelGroup} from './models/label';

describe('LabelGroupRepository (integration, in-memory RxDB)', () => {
  let db: RxDatabase;
  let repository: LabelGroupRepository;

  beforeEach(async () => {
    const testDb = await createTestDatabase();
    db = testDb.db;
    repository = new LabelGroupRepository(testDb.accessor as unknown as DatabaseService);
  });

  afterEach(async () => {
    await db.close();
  });

  it('save() then findById() round-trips a label group', async () => {
    const group: RxLabelGroup = {id: 'group-1', name: 'Art'};

    await firstValueFrom(repository.save(group));
    const found = await firstValueFrom(repository.findById('group-1'));

    expect(found.name).toBe('Art');
  });

  it('deleteById() removes the group', async () => {
    const group: RxLabelGroup = {id: 'group-1', name: 'Art'};
    await firstValueFrom(repository.save(group));

    const deleted = await firstValueFrom(repository.deleteById('group-1'));

    expect(deleted).toBe(true);
    await expect(firstValueFrom(repository.findById('group-1'))).rejects.toThrow(/not found/i);
  });
});
