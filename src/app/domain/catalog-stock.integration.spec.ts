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
    const test = await createTestDatabase(false);
    db = test.db;
    TestBed.configureTestingModule({providers: [{provide: DatabaseService, useValue: test.accessor}]});
    catalog = TestBed.inject(CatalogService);
    shopping = TestBed.inject(ShoppingService);
    stock = TestBed.inject(StockService);
    ingredients = TestBed.inject(IngredientService);
    categories = TestBed.inject(CategoryService);
  });
  afterEach(async () => {
    await db.close();
  });

  it('matches a generic 200 ml milk need to a scanned 1 L product and keeps all stock', async () => {
    const milk = await catalog.createClass('Milk');
    const carton = catalog.productDraft({
      barcode: '1234567890123',
      name: 'Milk 1 L',
      brand: 'Brand',
      packageQuantity: '1 l'
    }, milk.id);
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
    const carton = catalog.productDraft({
      barcode: '1234567890128',
      name: 'Oat milk carton',
      brand: null,
      packageQuantity: '1 l'
    }, oat.id);
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
    const bar = catalog.productDraft({
      barcode: '1234567890124',
      name: 'Chocolate bar',
      brand: null,
      packageQuantity: '100 g'
    }, bars.id);
    await catalog.save(bar);
    const lot = await stock.receive(bar.id, {packages: 6});
    await stock.save({...lot, remainingAmount: 550});
    expect((await stock.all())[0].remainingAmount).toBe(550);
    await expect(stock.save({...lot, remainingAmount: 650})).rejects.toThrow(/Remaining stock/);
  });

  it('keeps an older lot editable after the catalog package size changes', async () => {
    const drinks = await catalog.createClass('Drinks');
    const carton = catalog.productDraft({
      barcode: '1234567890999', name: 'Oat drink', brand: null, packageQuantity: '1 l'
    }, drinks.id);
    await catalog.save(carton);
    const oldLot = await stock.receive(carton.id);
    await catalog.save({...carton, packageAmount: 750, rawPackage: '750 ml'});
    await stock.save({...oldLot, remainingAmount: 500});
    expect((await stock.all()).find(lot => lot.id === oldLot.id)?.acquiredAmount).toBe(1000);
    const newLot = await stock.receive(carton.id);
    expect(newLot.acquiredAmount).toBe(750);
  });

  it('keeps a partially fulfilled entry until enough packages have been scanned', async () => {
    const bars = await catalog.createClass('Chocolate bars');
    const bar = catalog.productDraft({
      barcode: '1234567890125',
      name: 'Chocolate bar',
      brand: null,
      packageQuantity: '100 g'
    }, bars.id);
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
    const carton = catalog.productDraft({
      barcode: '1234567890126',
      name: 'Special milk',
      brand: 'Brand',
      packageQuantity: '1 l'
    }, milk.id);
    await catalog.save(carton);
    const generic = await shopping.addProduct('list', milk.id, {kind: 'quantity', quantity: {amount: 200, unit: 'ml'}});
    const exact = await shopping.addProduct('list', carton.id, {kind: 'packages', count: 1});
    const lot = await stock.receive(carton.id, {shoppingListId: 'list'});
    expect(lot.allocations).toEqual([{shoppingEntryId: exact.id, amount: 1, unit: 'package'}]);
    expect((await shopping.all('list')).map(entry => entry.id)).toEqual([generic.id]);
  });

  it('fulfills a package count targeted at a class', async () => {
    const eggs = await catalog.createClass('Eier');
    const carton = catalog.productDraft({
      barcode: '1234567890199', name: 'Bio Eier', brand: null, packageQuantity: '6 pieces'
    }, eggs.id);
    await catalog.save(carton);
    const entry = await shopping.addProduct('list', eggs.id, {kind: 'packages', count: 2});
    const lot = await stock.receive(carton.id, {shoppingListId: 'list', packages: 2});
    expect(lot.allocations).toEqual([{shoppingEntryId: entry.id, amount: 2, unit: 'package'}]);
    expect(await shopping.all('list')).toHaveLength(0);
  });

  it('does not reuse a partly allocated package as a second whole package', async () => {
    const milk = await catalog.createClass('Milk');
    const carton = catalog.productDraft({
      barcode: '1234567890130',
      name: 'Milk carton',
      brand: null,
      packageQuantity: '1 l'
    }, milk.id);
    await catalog.save(carton);
    const measured = await shopping.addProduct('list', milk.id, {
      kind: 'quantity',
      quantity: {amount: 200, unit: 'ml'}
    });
    const unspecified = await shopping.addProduct('list', milk.id, {kind: 'unspecified'});
    const lot = await stock.receive(carton.id, {shoppingListId: 'list'});
    expect(lot.allocations).toEqual([{shoppingEntryId: measured.id, amount: 200, unit: 'ml'}]);
    expect((await shopping.all('list')).map(entry => entry.id)).toEqual([unspecified.id]);
  });

  it('adds unmatched and unknown-size scans to stock without inventing measured availability', async () => {
    const milk = await catalog.createClass('Milk');
    const carton = catalog.productDraft({
      barcode: '1234567890127',
      name: 'Mystery milk',
      brand: null,
      packageQuantity: 'carton'
    }, milk.id);
    await catalog.save(carton);
    await stock.receive(carton.id, {shoppingListId: 'list'});
    expect(await stock.all()).toHaveLength(1);
    expect((await stock.availability(milk.id, {amount: 200, unit: 'ml'})).status).toBe('unknown');
  });

  it('does not count expired stock as available', async () => {
    const milk = await catalog.createClass('Milk');
    const carton = catalog.productDraft({
      barcode: '1234567890132',
      name: 'Milk carton',
      brand: null,
      packageQuantity: '1 l'
    }, milk.id);
    await catalog.save(carton);
    await stock.receive(carton.id, {expiryDate: '2000-01-01'});
    expect((await stock.availability(milk.id, {amount: 200, unit: 'ml'})).status).toBe('insufficient');
  });

  it('stores class and exact-product recipe requirements and exports measured needs', async () => {
    const milk = await catalog.createClass('Milk');
    const carton = catalog.productDraft({
      barcode: '1234567890131',
      name: 'Special milk',
      brand: 'Brand',
      packageQuantity: '1 l'
    }, milk.id);
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

  it('deletes a class alone, moves its children up, and removes only its own references', async () => {
    const drinks = await catalog.createClass('Drinks');
    const milk = await catalog.createClass('Milk', drinks.id);
    const carton = catalog.productDraft({
      barcode: '1234567890140',
      name: 'Milk carton',
      brand: null,
      packageQuantity: '1 l'
    }, milk.id);
    await catalog.save(carton);
    const removedEntry = await shopping.addProduct('list', drinks.id,
      {kind: 'quantity', quantity: {amount: 1500, unit: 'ml'}});
    const lot = await stock.receive(carton.id, {shoppingListId: 'list'});
    expect(lot.allocations.some(allocation => allocation.shoppingEntryId === removedEntry.id)).toBe(true);
    const keptEntry = await shopping.addProduct('list', milk.id, {kind: 'unspecified'});
    await firstValueFrom(ingredients.saveIngredientsForRecipe('recipe', [
      {id: 'drinks-ingredient', recipeId: 'recipe', targetNodeId: drinks.id, name: 'Drinks', amount: 100, unit: 'ml'},
      {id: 'milk-ingredient', recipeId: 'recipe', targetNodeId: milk.id, name: 'Milk', amount: 100, unit: 'ml'},
    ]));

    const impact = await catalog.previewDelete(drinks.id, false);
    expect(impact).toMatchObject({
      movedChildCount: 1, deletedNodeCount: 1,
      shoppingEntryCount: 1, recipeIngredientCount: 1, stockLotCount: 0
    });
    await catalog.delete(drinks.id, false);

    expect((await catalog.byId(milk.id)).parentId).toBe('root-food');
    expect(await catalog.byId(carton.id)).toBeDefined();
    expect((await shopping.all('list')).map(entry => entry.id)).toEqual([keptEntry.id]);
    expect((await stock.all()).map(item => item.id)).toEqual([lot.id]);
    expect((await stock.all())[0].allocations).toEqual([]);
    expect((await firstValueFrom(ingredients.getIngredientsForRecipe('recipe').pipe(take(1)))).map(item => item.id))
      .toEqual(['milk-ingredient']);
  });

  it('deletes a class subtree and the shopping, fridge, and recipe records that use it', async () => {
    const drinks = await catalog.createClass('Drinks');
    const milk = await catalog.createClass('Milk', drinks.id);
    const carton = catalog.productDraft({
      barcode: '1234567890141',
      name: 'Milk carton',
      brand: null,
      packageQuantity: '1 l'
    }, milk.id);
    await catalog.save(carton);
    await stock.receive(carton.id);
    await shopping.addProduct('list', drinks.id, {kind: 'unspecified'});
    await shopping.addProduct('list', carton.id, {kind: 'packages', count: 1});
    await firstValueFrom(ingredients.saveIngredientsForRecipe('recipe', [
      {id: 'milk-ingredient', recipeId: 'recipe', targetNodeId: milk.id, name: 'Milk', amount: 100, unit: 'ml'},
    ]));

    const impact = await catalog.previewDelete(drinks.id, true);
    expect(impact).toMatchObject({
      descendantCount: 2, deletedNodeCount: 3,
      shoppingEntryCount: 2, recipeIngredientCount: 1, stockLotCount: 1
    });
    await catalog.delete(drinks.id, true);

    expect((await catalog.all()).map(node => node.id)).toEqual(expect.arrayContaining(['root-food', 'root-household']));
    expect((await catalog.all()).some(node => [drinks.id, milk.id, carton.id].includes(node.id))).toBe(false);
    expect(await shopping.all('list')).toHaveLength(0);
    expect(await stock.all()).toHaveLength(0);
    expect(await firstValueFrom(ingredients.getIngredientsForRecipe('recipe').pipe(take(1)))).toHaveLength(0);
    expect(await catalog.byBarcode('1234567890141')).toBeNull();
  });

  it('protects roots and refuses a child move that would create duplicate sibling classes', async () => {
    const milk = await catalog.createClass('Milk');
    const drinks = await catalog.createClass('Drinks');
    const nestedMilk = await catalog.createClass('Milk', drinks.id);
    await expect(catalog.delete('root-food', true)).rejects.toThrow(/Built-in root categories/);
    await expect(catalog.delete(drinks.id, false)).rejects.toThrow(/subcategory already exists/);
    expect(await catalog.byId(drinks.id)).toBeDefined();
    expect((await catalog.byId(nestedMilk.id)).parentId).toBe(drinks.id);
    expect((await catalog.byId(milk.id)).parentId).toBe('root-food');
  });

  it('can delete a custom top-level category while keeping its child categories', async () => {
    const customRoot = await catalog.createClass('Other', null);
    const child = await catalog.createClass('Supplies', customRoot.id);
    await catalog.delete(customRoot.id, false);
    expect((await catalog.byId(child.id)).parentId).toBeNull();
    await expect(catalog.byId(customRoot.id)).rejects.toThrow(/not found/);
  });
});
