import {firstValueFrom} from 'rxjs';
import {RxDatabase} from 'rxdb';
import {createTestDatabase} from '../database/test-support/create-test-database';
import {DatabaseService} from '../database/database';
import {TodoRepository} from './todo.repository';
import {RxToDo} from './rxToDo';
import {ImportanceLevel} from './importance-level.enum';

describe('TodoRepository (integration, in-memory RxDB)', () => {
  let db: RxDatabase;
  let repository: TodoRepository;

  beforeEach(async () => {
    const testDb = await createTestDatabase();
    db = testDb.db;
    repository = new TodoRepository(testDb.accessor as unknown as DatabaseService);
  });

  afterEach(async () => {
    await db.close();
  });

  const todo = (overrides: Partial<RxToDo> = {}): RxToDo => ({
    id: 't1',
    categoryId: 'cat-1',
    name: 'Milk',
    importance: ImportanceLevel.NORMAL,
    done: false,
    ...overrides
  });

  it('findByCategoryId() only returns todos for that category', async () => {
    await firstValueFrom(repository.saveAll([
      todo({id: 't1', categoryId: 'cat-1', name: 'Milk'}),
      todo({id: 't2', categoryId: 'cat-1', name: 'Eggs'}),
      todo({id: 't3', categoryId: 'cat-2', name: 'Bread'})
    ]));

    const cat1Todos = await firstValueFrom(repository.findByCategoryId('cat-1'));

    expect(cat1Todos.map(t => t.id).sort()).toEqual(['t1', 't2']);
  });

  it('findByCategoryId() returns todos in the order they were added, not by id', async () => {
    // ids are chosen so that alphabetical/UUID ordering would NOT match insertion order
    await firstValueFrom(repository.save(todo({id: 'z-first', categoryId: 'cat-1', name: 'Milk'})));
    await firstValueFrom(repository.save(todo({id: 'm-second', categoryId: 'cat-1', name: 'Eggs'})));
    await firstValueFrom(repository.save(todo({id: 'a-third', categoryId: 'cat-1', name: 'Bread'})));

    const cat1Todos = await firstValueFrom(repository.findByCategoryId('cat-1'));

    expect(cat1Todos.map(t => t.id)).toEqual(['z-first', 'm-second', 'a-third']);
  });

  it('findByCategoryId() returns an empty array when the category has no todos', async () => {
    const result = await firstValueFrom(repository.findByCategoryId('unknown-category'));
    expect(result).toEqual([]);
  });

  it('deleteByCategoryId() removes only that category\'s todos', async () => {
    await firstValueFrom(repository.saveAll([
      todo({id: 't1', categoryId: 'cat-1'}),
      todo({id: 't2', categoryId: 'cat-1'}),
      todo({id: 't3', categoryId: 'cat-2'})
    ]));

    const deletedCount = await firstValueFrom(repository.deleteByCategoryId('cat-1'));

    expect(deletedCount).toBe(2);
    const remaining = await firstValueFrom(repository.findAll());
    expect(remaining.map(t => t.id)).toEqual(['t3']);
  });
});
