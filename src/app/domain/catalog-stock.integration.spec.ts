import {TestBed} from '@angular/core/testing';
import {RxDatabase} from 'rxdb';
import {DatabaseService} from '../database/database';
import {createTestDatabase} from '../database/test-support/create-test-database';
import {CatalogService} from './catalog.service';
import {ShoppingService} from './shopping.service';
import {StockService} from './stock.service';
import {IngredientService} from '../ingredients/ingredient.service';
import {CategoryService} from '../category/category.service';
import {firstValueFrom, take} from 'rxjs';

describe('shared catalog, shopping, and stock', () => {
  let db: RxDatabase;
  let catalog: CatalogService;
  let shopping: ShoppingService;
  let stock: StockService;
  let ingredients: IngredientService;
  let categories: CategoryService;

  beforeEach(async () => {
    const test = await createTestDatabase();
    db = test.db;
    TestBed.configureTestingModule({providers: [{provide: DatabaseService, useValue: test.accessor}]});
    catalog = TestBed.inject(CatalogService);
    shopping = TestBed.inject(ShoppingService);
    stock = TestBed.inject(StockService);
    ingredients = TestBed.inject(IngredientService);
    categories = TestBed.inject(CategoryService);
  });
  afterEach(async () => { await db.close(); });

  it('matches a generic 200 ml milk need to a scanned 1 L product and keeps all stock', async () => {
    const milk = await catalog.createClass('Milk');
    const carton = catalog.productDraft({barcode: '1234567890123', name: 'Milk 1 L', brand: 'Brand', packageQuantity: '1 l'}, milk.id);
    await catalog.save(carton);
    const entry = await shopping.addProduct('list', milk.id, {kind: 'quantity', quantity: {amount: 200, unit: 'ml'}});
    await shopping.toggleChecked(entry);
    const lot = await stock.receive(carton.id, {shoppingListId: 'list', scanId: 'scan-one'});
    expect(lot.acquiredAmount).toBe(1000);
    expect(lot.remainingAmount).toBe(1000);
    expect(lot.allocations).toEqual([{shoppingEntryId: entry.id, amount: 200, unit: 'ml'}]);
    expect(await shopping.all('list')).toHaveLength(0);
    expect((await stock.availability(milk.id, {amount: 200, unit: 'ml'})).status).toBe('enough');
    expect((await stock.receive(carton.id, {shoppingListId: 'list', scanId: 'scan-one'})).id).toBe('scan-one');
    expect(await stock.all()).toHaveLength(1);
  });

  it('matches a product through multiple category levels but not a sibling branch', async () => {
    const milk = await catalog.createClass('Milk');
    const oat = await catalog.createClass('Oat milk', milk.id);
    const juice = await catalog.createClass('Juice');
    const carton = catalog.productDraft({barcode: '1234567890128', name: 'Oat milk carton', brand: null, packageQuantity: '1 l'}, oat.id);
    await catalog.save(carton);
    const nodes = await catalog.all();
    expect(catalog.matches(milk.id, carton.id, nodes)).toBe(true);
    expect(catalog.matches(juice.id, carton.id, nodes)).toBe(false);
    const entry = await shopping.addProduct('list', milk.id, {kind: 'quantity', quantity: {amount: 200, unit: 'ml'}});
    await stock.receive(carton.id, {shoppingListId: 'list'});
    expect((await shopping.all('list')).some(item => item.id === entry.id)).toBe(false);
  });

  it('allows 550 g remaining across six 100 g bars, but never above purchased capacity', async () => {
    const bars = await catalog.createClass('Chocolate bars');
    const bar = catalog.productDraft({barcode: '1234567890124', name: 'Chocolate bar', brand: null, packageQuantity: '100 g'}, bars.id);
    await catalog.save(bar);
    const lot = await stock.receive(bar.id, {packages: 6});
    await stock.save({...lot, remainingAmount: 550});
    expect((await stock.all())[0].remainingAmount).toBe(550);
    await expect(stock.save({...lot, remainingAmount: 650})).rejects.toThrow(/Remaining stock/);
  });

  it('keeps a partially fulfilled entry until enough packages have been scanned', async () => {
    const bars = await catalog.createClass('Chocolate bars');
    const bar = catalog.productDraft({barcode: '1234567890125', name: 'Chocolate bar', brand: null, packageQuantity: '100 g'}, bars.id);
    await catalog.save(bar);
    const entry = await shopping.addProduct('list', bars.id, {kind: 'quantity', quantity: {amount: 250, unit: 'g'}});
    await stock.receive(bar.id, {shoppingListId: 'list'});
    await stock.receive(bar.id, {shoppingListId: 'list'});
    expect(await shopping.progress(entry)).toBe(200);
    expect(await shopping.all('list')).toHaveLength(1);
    await stock.receive(bar.id, {shoppingListId: 'list'});
    expect(await shopping.all('list')).toHaveLength(0);
  });

  it('allocates an exact product before a matching generic class', async () => {
    const milk = await catalog.createClass('Milk');
    const carton = catalog.productDraft({barcode: '1234567890126', name: 'Special milk', brand: 'Brand', packageQuantity: '1 l'}, milk.id);
    await catalog.save(carton);
    const generic = await shopping.addProduct('list', milk.id, {kind: 'quantity', quantity: {amount: 200, unit: 'ml'}});
    const exact = await shopping.addProduct('list', carton.id, {kind: 'packages', count: 1});
    const lot = await stock.receive(carton.id, {shoppingListId: 'list'});
    expect(lot.allocations).toEqual([{shoppingEntryId: exact.id, amount: 1, unit: 'package'}]);
    expect((await shopping.all('list')).map(entry => entry.id)).toEqual([generic.id]);
  });

  it('does not reuse a partly allocated package as a second whole package', async () => {
    const milk = await catalog.createClass('Milk');
    const carton = catalog.productDraft({barcode: '1234567890130', name: 'Milk carton', brand: null, packageQuantity: '1 l'}, milk.id);
    await catalog.save(carton);
    const measured = await shopping.addProduct('list', milk.id, {kind: 'quantity', quantity: {amount: 200, unit: 'ml'}});
    const unspecified = await shopping.addProduct('list', milk.id, {kind: 'unspecified'});
    const lot = await stock.receive(carton.id, {shoppingListId: 'list'});
    expect(lot.allocations).toEqual([{shoppingEntryId: measured.id, amount: 200, unit: 'ml'}]);
    expect((await shopping.all('list')).map(entry => entry.id)).toEqual([unspecified.id]);
  });

  it('adds unmatched and unknown-size scans to stock without inventing measured availability', async () => {
    const milk = await catalog.createClass('Milk');
    const carton = catalog.productDraft({barcode: '1234567890127', name: 'Mystery milk', brand: null, packageQuantity: 'carton'}, milk.id);
    await catalog.save(carton);
    await stock.receive(carton.id, {shoppingListId: 'list'});
    expect(await stock.all()).toHaveLength(1);
    expect((await stock.availability(milk.id, {amount: 200, unit: 'ml'})).status).toBe('unknown');
  });

  it('does not count expired stock as available', async () => {
    const milk = await catalog.createClass('Milk');
    const carton = catalog.productDraft({barcode: '1234567890132', name: 'Milk carton', brand: null, packageQuantity: '1 l'}, milk.id);
    await catalog.save(carton);
    await stock.receive(carton.id, {expiryDate: '2000-01-01'});
    expect((await stock.availability(milk.id, {amount: 200, unit: 'ml'})).status).toBe('insufficient');
  });

  it('stores class and exact-product recipe requirements and exports measured needs', async () => {
    const milk = await catalog.createClass('Milk');
    const carton = catalog.productDraft({barcode: '1234567890131', name: 'Special milk', brand: 'Brand', packageQuantity: '1 l'}, milk.id);
    await catalog.save(carton);
    await firstValueFrom(ingredients.saveIngredientsForRecipe('recipe', [
      {id: 'generic', recipeId: 'recipe', targetNodeId: milk.id, name: 'Milk', amount: 200, unit: 'ml'},
      {id: 'exact', recipeId: 'recipe', targetNodeId: carton.id, name: 'Special milk', amount: 100, unit: 'ml'},
    ]));
    const requirements = await firstValueFrom(ingredients.getIngredientsForRecipe('recipe').pipe(take(1)));
    expect(requirements.map(item => item.targetNodeId).sort()).toEqual([milk.id, carton.id].sort());
    await firstValueFrom(categories.addIngredientsToCategory('list', requirements));
    const entries = await shopping.all('list');
    expect(entries.map(entry => [entry.targetNodeId, entry.needAmount, entry.needUnit]).sort())
      .toEqual([[milk.id, 200, 'ml'], [carton.id, 100, 'ml']].sort());
    await stock.receive(carton.id, {shoppingListId: 'list'});
    expect(await shopping.all('list')).toHaveLength(0);
    expect((await stock.availability(carton.id, {amount: 200, unit: 'ml'})).status).toBe('enough');
  });
});
