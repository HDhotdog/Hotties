import {firstValueFrom} from 'rxjs';
import {RxDatabase} from 'rxdb';
import {TestBed} from '@angular/core/testing';
import {createTestDatabase} from '../database/test-support/create-test-database';
import {DatabaseService} from '../database/database';
import {CategoryRepository} from './category.repository';
import {RxCategory} from './category';

describe('CategoryRepository (integration, in-memory RxDB)', () => {
  let db: RxDatabase;
  let repository: CategoryRepository;

  beforeEach(async () => {
    const testDb = await createTestDatabase();
    db = testDb.db;
    TestBed.configureTestingModule({
      providers: [{provide: DatabaseService, useValue: testDb.accessor}]
    });
    repository = TestBed.inject(CategoryRepository);
  });

  afterEach(async () => {
    await db.close();
  });

  const category = (overrides: Partial<RxCategory> = {}): RxCategory => ({
    id: 'cat-1',
    name: 'Rewe',
    saveSuggestions: true,
    ...overrides
  });

  it('save() upserts a document that findAll() then returns', async () => {
    await firstValueFrom(repository.save(category()));

    const all = await firstValueFrom(repository.findAll());
    // the database is seeded with a default "Edeka" category, plus the one we just saved
    expect(all.map(c => c.id)).toEqual(expect.arrayContaining(['cat-1']));
    expect(all.find(c => c.id === 'cat-1')).toMatchObject({name: 'Rewe', saveSuggestions: true});
  });

  it('save() with an existing id overwrites the previous document (upsert)', async () => {
    await firstValueFrom(repository.save(category({name: 'Rewe'})));
    await firstValueFrom(repository.save(category({name: 'Aldi'})));

    const found = await firstValueFrom(repository.findById('cat-1'));
    expect(found.name).toBe('Aldi');
  });

  it('findById() rejects when no document exists for the id', async () => {
    await expect(firstValueFrom(repository.findById('missing'))).rejects.toThrow(/not found/i);
  });

  it('saveAll() bulk-upserts multiple documents', async () => {
    await firstValueFrom(repository.saveAll([
      category({id: 'cat-1', name: 'Rewe'}),
      category({id: 'cat-2', name: 'Aldi'})
    ]));

    const all = await firstValueFrom(repository.findAll());
    expect(all.map(c => c.id)).toEqual(expect.arrayContaining(['cat-1', 'cat-2']));
  });

  it('deleteById() removes only the targeted document and reports success', async () => {
    await firstValueFrom(repository.saveAll([
      category({id: 'cat-1'}),
      category({id: 'cat-2'})
    ]));

    const deleted = await firstValueFrom(repository.deleteById('cat-1'));

    expect(deleted).toBe(true);
    const all = await firstValueFrom(repository.findAll());
    expect(all.map(c => c.id)).not.toContain('cat-1');
    expect(all.map(c => c.id)).toContain('cat-2');
  });

  it('deleteById() returns false when the document does not exist', async () => {
    const deleted = await firstValueFrom(repository.deleteById('missing'));
    expect(deleted).toBe(false);
  });

  it('deleteAll() clears every document in the collection and reports the count', async () => {
    await firstValueFrom(repository.saveAll([
      category({id: 'cat-1'}),
      category({id: 'cat-2'})
    ]));

    // +1 for the seeded default "Edeka" category
    const deletedCount = await firstValueFrom(repository.deleteAll());

    expect(deletedCount).toBe(3);
    const all = await firstValueFrom(repository.findAll());
    expect(all).toEqual([]);
  });

  it('findAll() is a live query that emits again after a save', async () => {
    const emissions: RxCategory[][] = [];
    const sub = repository.findAll().subscribe(categories => emissions.push([...categories]));
    // let the initial emission land before saving
    await new Promise(resolve => setTimeout(resolve, 50));

    await firstValueFrom(repository.save(category({id: 'cat-1'})));
    await new Promise(resolve => setTimeout(resolve, 200));

    sub.unsubscribe();

    expect(emissions.length).toBeGreaterThanOrEqual(2);
    expect(emissions[emissions.length - 1].map(c => c.id)).toContain('cat-1');
  });
});
