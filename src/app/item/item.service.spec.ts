import {firstValueFrom} from 'rxjs';
import {RxDatabase} from 'rxdb';
import {TestBed} from '@angular/core/testing';
import {createTestDatabase} from '../database/test-support/create-test-database';
import {DatabaseService} from '../database/database';
import {ItemService} from './item.service';
import {TodoService} from '../todo/todo.service';
import {ItemType} from '../todo/item-type.enum';
import {AmountUnit} from '../shared/amount-unit.enum';
import {v4 as uuidv4} from 'uuid';

describe('ItemService.findOrCreateByName (integration, in-memory RxDB)', () => {
  let db: RxDatabase;
  let itemService: ItemService;
  let todoService: TodoService;

  beforeEach(async () => {
    const testDb = await createTestDatabase();
    db = testDb.db;
    TestBed.configureTestingModule({
      providers: [{provide: DatabaseService, useValue: testDb.accessor}]
    });
    itemService = TestBed.inject(ItemService);
    todoService = TestBed.inject(TodoService);
  });

  afterEach(async () => {
    await db.close();
  });

  it('does not resurrect a deleted todo when an unrelated item is saved afterwards', async () => {
    const todoId = uuidv4();

    // Matches how every real caller uses save() - a bare .subscribe(), never
    // unsubscribed. That's what exposes the leak: findOrCreateByName's old
    // implementation was built on a live (never-completing) query, so this
    // subscription would stay attached to the items collection forever.
    todoService.save({
      id: todoId,
      categoryId: 'cat-1',
      name: 'Bananas',
      type: ItemType.FOOD,
      amount: AmountUnit.PIECE,
      done: false,
      quantity: 1,
    }).subscribe();

    await new Promise((resolve) => setTimeout(resolve, 50));

    await firstValueFrom(todoService.deleteById(todoId));
    expect(await firstValueFrom(todoService.findAll())).toEqual([]);

    // An unrelated write to the items collection - regression check: this used to
    // re-trigger the leaked subscription from the save() call above, which would
    // re-upsert the deleted todo back into existence.
    itemService.findOrCreateByName('Some Other Item').subscribe();

    // Give any leaked subscriptions a chance to fire before asserting.
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(await firstValueFrom(todoService.findAll())).toEqual([]);
  });

  it('reuses the same item for repeated names instead of creating duplicates', async () => {
    const first = await firstValueFrom(itemService.findOrCreateByName('Milk'));
    const second = await firstValueFrom(itemService.findOrCreateByName('milk '));

    expect(second.id).toBe(first.id);
    expect((await firstValueFrom(itemService.findAll())).length).toBe(1);
  });

  it('caches scanned product metadata by barcode in the shared items collection', async () => {
    const product = {barcode: '1234567890123', name: 'Oat milk', brand: 'Oatly', packageQuantity: '1 l'};
    const first = await firstValueFrom(itemService.saveScannedProduct(product));
    const second = await firstValueFrom(itemService.saveScannedProduct(product));

    expect(second.id).toBe(first.id);
    expect(await firstValueFrom(itemService.findByBarcode(product.barcode))).toMatchObject(product);
    expect((await firstValueFrom(itemService.findAll())).length).toBe(1);
  });
});
