import {TestBed} from '@angular/core/testing';
import {firstValueFrom} from 'rxjs';
import {RxDatabase} from 'rxdb';
import {createTestDatabase} from '../database/test-support/create-test-database';
import {DatabaseService} from '../database/database';
import {CategoryService} from './category.service';
import {ShoppingService} from '../domain/shopping.service';

describe('Shopping list persistence and deletion', () => {
  let db: RxDatabase;
  let service: CategoryService;
  let defaultId: string;

  beforeEach(async () => {
    const testDb = await createTestDatabase(false);
    db = testDb.db;
    TestBed.configureTestingModule({providers: [{provide: DatabaseService, useValue: testDb.accessor}]});
    service = TestBed.inject(CategoryService);
    defaultId = (await firstValueFrom(service.getCategories()))[0].id;
  });

  afterEach(async () => { await db.close(); });

  async function addList(id: string, sortOrder = 1) {
    await firstValueFrom(service.save({id, name: id, sortOrder, saveSuggestions: true}));
  }

  async function addItem(id: string, shoppingListId: string, checked = false) {
    await TestBed.inject(ShoppingService).save({id, shoppingListId, label: id, kind: 'product',
      needKind: 'unspecified', needAmount: null, needUnit: null, checked, createdAt: 1, retiredAllocations: []});
  }

  it('orders all readers by the persisted position and appends new lists', async () => {
    await addList('b', 1);
    await addList('a', 2);
    const lists = await firstValueFrom(service.getCategories());
    await firstValueFrom(service.saveAll([lists[2], lists[0], lists[1]].map((list, sortOrder) => ({...list, sortOrder}))));
    await addList('last', 3);
    expect((await firstValueFrom(service.getCategories())).map(list => list.id)).toEqual(['a', defaultId, 'b', 'last']);
  });

  it('rejects deleting the last list before removing its contents', async () => {
    await addItem('milk', defaultId);
    await expect(firstValueFrom(service.deleteCategory(defaultId, 1))).rejects.toThrow('Keep at least one');
    expect(await service.getItemCount(defaultId)).toBe(1);
    expect(await db['categories'].findOne(defaultId).exec()).toBeTruthy();
  });

  it('serializes simultaneous deletions and leaves one list', async () => {
    await addList('second');
    const results = await Promise.allSettled([
      firstValueFrom(service.deleteCategory(defaultId)), firstValueFrom(service.deleteCategory('second')),
    ]);
    expect(results.map(result => result.status)).toEqual(['fulfilled', 'rejected']);
    expect((await firstValueFrom(service.getCategories())).map(list => list.id)).toEqual(['second']);
  });

  it('counts checked items too and rejects a changed count or missing confirmation', async () => {
    await addList('second');
    await addItem('milk', defaultId);
    await addItem('bread', defaultId, true);
    expect(await service.getItemCount(defaultId)).toBe(2);
    await expect(firstValueFrom(service.deleteCategory(defaultId))).rejects.toThrow('items in this list changed');
    await expect(firstValueFrom(service.deleteCategory(defaultId, 1))).rejects.toThrow('items in this list changed');
    expect(await service.getItemCount(defaultId)).toBe(2);
  });

  it('deletes confirmed contents and related data, preserves other lists, and repairs selection', async () => {
    await addList('second');
    await addItem('milk', defaultId);
    await addItem('bread', defaultId, true);
    await addItem('other', 'second');
    await firstValueFrom(service.saveCurrentCategory((await firstValueFrom(service.getCategories()))[0]));
    await db['suggestions'].upsert({id: 'suggestion', categoryId: defaultId, suggestion: 'Milk', suffix: ''});
    await db['internal_product_map'].upsert({id: 'map', storeId: defaultId, productCode: '12345', productId: 'product'});
    expect(await firstValueFrom(service.deleteCategory(defaultId, 2))).toBe(true);
    expect(await service.getItemCount(defaultId)).toBe(0);
    expect(await service.getItemCount('second')).toBe(1);
    expect(await db['categories'].findOne(defaultId).exec()).toBeNull();
    expect(await db['suggestions'].findOne('suggestion').exec()).toBeNull();
    expect(await db['internal_product_map'].findOne('map').exec()).toBeNull();
    expect(await firstValueFrom(service.getSelectedCategoryId())).toBe('second');
  });

  it('retains the list if content cleanup fails', async () => {
    await addList('second');
    jest.spyOn(TestBed.inject(ShoppingService), 'clearList').mockRejectedValue(new Error('cleanup failed'));
    await expect(firstValueFrom(service.deleteCategory(defaultId))).rejects.toThrow('cleanup failed');
    expect(await db['categories'].findOne(defaultId).exec()).toBeTruthy();
  });
});
