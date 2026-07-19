import {firstValueFrom} from 'rxjs';
import {RxDatabase} from 'rxdb';
import {createTestDatabase} from '../database/test-support/create-test-database';
import {DatabaseService} from '../database/database';
import {LabelRepository} from './label.repository';
import {RxLabel} from './models/label';

describe('LabelRepository (integration, in-memory RxDB)', () => {
  let db: RxDatabase;
  let repository: LabelRepository;

  beforeEach(async () => {
    const testDb = await createTestDatabase();
    db = testDb.db;
    repository = new LabelRepository(testDb.accessor as unknown as DatabaseService);
  });

  afterEach(async () => {
    await db.close();
  });

  const label = (overrides: Partial<RxLabel> = {}): RxLabel => ({
    id: 'l1',
    groupId: 'group-1',
    recipeId: '',
    name: 'Frühstück',
    ...overrides
  });

  it('findByRecipeId() only returns labels assigned to that recipe', async () => {
    await firstValueFrom(repository.saveAll([
      label({id: 'l1', recipeId: 'recipe-1', name: 'Süß'}),
      label({id: 'l2', recipeId: 'recipe-1', name: 'Schnell'}),
      label({id: 'l3', recipeId: 'recipe-2', name: 'Scharf'}),
      label({id: 'l4', recipeId: '', name: 'template label'})
    ]));

    const recipe1Labels = await firstValueFrom(repository.findByRecipeId('recipe-1'));

    expect(recipe1Labels.map(l => l.id).sort()).toEqual(['l1', 'l2']);
  });

  it('findDistinctNames() de-duplicates label names across the collection', async () => {
    await firstValueFrom(repository.saveAll([
      label({id: 'l1', name: 'Süß'}),
      label({id: 'l2', name: 'Süß'}),
      label({id: 'l3', name: 'Scharf'})
    ]));

    const names = await firstValueFrom(repository.findDistinctNames());

    expect(names).toEqual(expect.arrayContaining(['Süß', 'Scharf']));
    expect(names.filter(n => n === 'Süß')).toHaveLength(1);
  });

  it('findUniqueLabels() keeps only the first label document per distinct name', async () => {
    await firstValueFrom(repository.saveAll([
      label({id: 'l1', name: 'Süß', groupId: 'group-a'}),
      label({id: 'l2', name: 'Süß', groupId: 'group-b'})
    ]));

    const unique = await firstValueFrom(repository.findUniqueLabels());
    const suess = unique.filter(l => l.name === 'Süß');

    expect(suess).toHaveLength(1);
  });

  it('deleteByLabelGroupId() removes only labels belonging to that group', async () => {
    await firstValueFrom(repository.saveAll([
      label({id: 'l1', groupId: 'group-a'}),
      label({id: 'l2', groupId: 'group-a'}),
      label({id: 'l3', groupId: 'group-b'})
    ]));

    const deletedCount = await firstValueFrom(repository.deleteByLabelGroupId('group-a'));

    expect(deletedCount).toBe(2);
    const remainingIds = (await firstValueFrom(repository.findAll())).map(l => l.id);
    expect(remainingIds).not.toContain('l1');
    expect(remainingIds).not.toContain('l2');
    expect(remainingIds).toContain('l3');
  });

  it('deleteByRecipeId() removes only labels assigned to that recipe', async () => {
    await firstValueFrom(repository.saveAll([
      label({id: 'l1', recipeId: 'recipe-1'}),
      label({id: 'l2', recipeId: 'recipe-2'})
    ]));

    const deletedCount = await firstValueFrom(repository.deleteByRecipeId('recipe-1'));

    expect(deletedCount).toBe(1);
    const remainingIds = (await firstValueFrom(repository.findAll())).map(l => l.id);
    expect(remainingIds).not.toContain('l1');
    expect(remainingIds).toContain('l2');
  });
});
