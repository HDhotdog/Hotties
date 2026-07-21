import {firstValueFrom} from 'rxjs';
import {RxDatabase} from 'rxdb';
import {TestBed} from '@angular/core/testing';
import {createTestDatabase} from '../database/test-support/create-test-database';
import {DatabaseService} from '../database/database';
import {FridgeItemRepository} from './fridge-item.repository';
import {RxFridgeItem} from './rxFridgeItem';
import {AmountUnit} from '../shared/amount-unit.enum';

describe('FridgeItemRepository (integration, in-memory RxDB)', () => {
  let db: RxDatabase;
  let repository: FridgeItemRepository;

  beforeEach(async () => {
    const testDb = await createTestDatabase();
    db = testDb.db;
    TestBed.configureTestingModule({
      providers: [{provide: DatabaseService, useValue: testDb.accessor}]
    });
    repository = TestBed.inject(FridgeItemRepository);
  });

  afterEach(async () => {
    await db.close();
  });

  const item = (overrides: Partial<RxFridgeItem> = {}): RxFridgeItem => ({
    id: 'f1',
    name: 'Milk',
    expiryDate: null,
    amount: AmountUnit.LITER,
    quantity: 1,
    ...overrides
  });

  it('save() then findById() round-trips a fridge item', async () => {
    await firstValueFrom(repository.save(item()));

    const found = await firstValueFrom(repository.findById('f1'));

    expect(found).toMatchObject(item());
  });

  it('deleteById() removes the fridge item', async () => {
    await firstValueFrom(repository.save(item()));

    const deleted = await firstValueFrom(repository.deleteById('f1'));

    expect(deleted).toBe(true);
    const all = await firstValueFrom(repository.findAll());
    expect(all).toEqual([]);
  });

  it('findAll() returns every saved fridge item', async () => {
    await firstValueFrom(repository.saveAll([
      item({id: 'f1', name: 'Milk'}),
      item({id: 'f2', name: 'Eggs', expiryDate: '2026-08-01'})
    ]));

    const all = await firstValueFrom(repository.findAll());

    expect(all.map(i => i.id).sort()).toEqual(['f1', 'f2']);
  });
});
