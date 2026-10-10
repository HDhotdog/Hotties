import {TestBed} from '@angular/core/testing';
import {RxDatabase} from 'rxdb';
import {DatabaseService} from '../database/database';
import {createTestDatabase} from '../database/test-support/create-test-database';
import {CatalogService} from '../domain/catalog.service';
import {ShoppingService} from '../domain/shopping.service';
import {StockService} from '../domain/stock.service';
import {InternalProductMapService} from './internal-product-map.service';

describe('internal weighed product mapping', () => {
  let db: RxDatabase;
  let catalog: CatalogService;
  let mapping: InternalProductMapService;
  let stock: StockService;

  beforeEach(async () => {
    const testDb = await createTestDatabase(false);
    db = testDb.db;
    TestBed.configureTestingModule({providers: [
      {provide: DatabaseService, useValue: testDb.accessor}, CatalogService, ShoppingService,
      StockService, InternalProductMapService,
    ]});
    catalog = TestBed.inject(CatalogService);
    mapping = TestBed.inject(InternalProductMapService);
    stock = TestBed.inject(StockService);
    await db['categories'].bulkUpsert([
      {id: 'store-a', name: 'Edeka', saveSuggestions: true},
      {id: 'store-b', name: 'Other store', saveSuggestions: true},
    ]);
  });

  afterEach(async () => db.close());

  it('scopes a product ID to its store and records decoded grams', async () => {
    const produce = await catalog.createClass('Produce');
    const zucchini = catalog.createLooseDraft('Zucchini', produce.id, 'g');
    await catalog.save(zucchini);
    await mapping.save('store-a', '14374', zucchini.id);
    expect((await mapping.get('store-a', '14374'))?.id).toBe(zucchini.id);
    expect(await mapping.get('store-b', '14374')).toBeNull();
    const tomatoes = catalog.createLooseDraft('Tomatoes', produce.id, 'g');
    await catalog.save(tomatoes);
    await mapping.save('store-b', '14374', tomatoes.id);
    expect((await mapping.get('store-b', '14374'))?.id).toBe(tomatoes.id);
    await mapping.save('store-a', '14374', tomatoes.id);
    expect((await mapping.get('store-a', '14374'))?.id).toBe(tomatoes.id);
    const lot = await stock.receive(zucchini.id, {
      shoppingListId: 'store-a', bulkQuantity: {amount: 304, unit: 'g'}, scanId: 'weighted-scan'
    });
    expect(lot.acquiredAmount).toBe(304);
    expect(lot.acquiredUnit).toBe('g');
    expect((await stock.receive(zucchini.id, {
      shoppingListId: 'store-a', bulkQuantity: {amount: 304, unit: 'g'}, scanId: 'weighted-scan'
    })).id).toBe(lot.id);
  });
});
