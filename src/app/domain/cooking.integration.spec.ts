import {TestBed} from '@angular/core/testing';
import {RxDatabase} from 'rxdb';
import {firstValueFrom} from 'rxjs';
import {DatabaseService} from '../database/database';
import {createTestDatabase} from '../database/test-support/create-test-database';
import {IngredientService} from '../ingredients/ingredient.service';
import {CatalogService} from './catalog.service';
import {ShoppingService} from './shopping.service';
import {StockService} from './stock.service';

describe('cooking a recipe', () => {
  let db: RxDatabase;
  let catalog: CatalogService;
  let stock: StockService;
  let shopping: ShoppingService;
  let ingredients: IngredientService;

  beforeEach(async () => {
    const test = await createTestDatabase(false);
    db = test.db;
    TestBed.configureTestingModule({providers: [{provide: DatabaseService, useValue: test.accessor}]});
    catalog = TestBed.inject(CatalogService);
    stock = TestBed.inject(StockService);
    shopping = TestBed.inject(ShoppingService);
    ingredients = TestBed.inject(IngredientService);
  });

  afterEach(async () => db.close());

  it('deducts inherited pinches and product-overridden onion pieces in each lot unit', async () => {
    const spices = await catalog.createClass('Spices');
    await catalog.save({...spices, unitConversions: {pinch: {amount: 2, unit: 'g'}}});
    const salt = catalog.productDraft({barcode: 'salt', name: 'Salt', brand: null, packageQuantity: '100 g'}, spices.id);
    await catalog.save(salt);
    const vegetables = await catalog.createClass('Vegetables');
    await catalog.save({...vegetables, unitConversions: {piece: {amount: 100, unit: 'g'}}});
    const onion = catalog.productDraft({barcode: 'onion', name: 'Onion', brand: null, packageQuantity: '1000 g'}, vegetables.id);
    await catalog.save({...onion, unitConversions: {piece: {amount: 80, unit: 'g'}}});
    await stock.receive(salt.id);
    await stock.receive(onion.id);
    await firstValueFrom(ingredients.saveIngredientsForRecipe('recipe', [
      {id: 'salt', recipeId: 'recipe', targetNodeId: salt.id, name: 'Salt', amount: 1, unit: 'pinch'},
      {id: 'onion', recipeId: 'recipe', targetNodeId: onion.id, name: 'Onion', amount: 1, unit: 'piece'}
    ]));
    const plan = await stock.planCook('recipe');
    expect(plan.ingredients.find(item => item.ingredientId === 'salt')?.deductions[0].amount).toBe(2);
    expect(plan.ingredients.find(item => item.ingredientId === 'onion')?.deductions[0].amount).toBe(80);
    expect((await stock.cook('recipe', plan)).status).toBe('cooked');
    const lots = await stock.all();
    expect(lots.find(lot => lot.productId === salt.id)?.remainingAmount).toBe(98);
    expect(lots.find(lot => lot.productId === onion.id)?.remainingAmount).toBe(920);
  });

  it('uses each product mapping for a category ingredient spanning mixed stock', async () => {
    const vegetables = await catalog.createClass('Vegetables');
    await catalog.save({...vegetables, unitConversions: {piece: {amount: 100, unit: 'g'}}});
    const roots = await catalog.createClass('Roots', vegetables.id);
    await catalog.save({...roots, unitConversions: {piece: {amount: 150, unit: 'g'}}});
    const onion = catalog.productDraft({barcode: 'onion', name: 'Onion', brand: null, packageQuantity: '80 g'}, vegetables.id);
    const potato = catalog.productDraft({barcode: 'potato', name: 'Potato', brand: null, packageQuantity: '150 g'}, roots.id);
    await catalog.save({...onion, unitConversions: {piece: {amount: 80, unit: 'g'}}});
    await catalog.save(potato);
    const onionLot = await stock.receive(onion.id, {expiryDate: '2099-01-01'});
    const potatoLot = await stock.receive(potato.id, {expiryDate: '2099-02-01'});
    await firstValueFrom(ingredients.saveIngredientsForRecipe('recipe', [
      {id: 'vegetables', recipeId: 'recipe', targetNodeId: vegetables.id,
        name: 'Vegetables', amount: 2, unit: 'piece'}
    ]));
    const plan = await stock.planCook('recipe');
    expect(plan.ingredients[0]).toMatchObject({used: 2, missing: 0});
    expect(plan.ingredients[0].deductions.map(item => [item.lotId, item.amount]))
      .toEqual([[onionLot.id, 80], [potatoLot.id, 150]]);
    await stock.cook('recipe', plan);
    expect(await stock.all()).toHaveLength(0);
  });

  it('uses exact needs first, then earliest expiry, without reusing category stock', async () => {
    const food = await catalog.createClass('Food test');
    const onion = catalog.productDraft({barcode: 'onion', name: 'Onion', brand: null, packageQuantity: '100 g'}, food.id);
    const potato = catalog.productDraft({barcode: 'potato', name: 'Potato', brand: null, packageQuantity: '100 g'}, food.id);
    await catalog.save(onion);
    await catalog.save(potato);
    const later = await stock.receive(onion.id, {expiryDate: '2099-02-01'});
    const sooner = await stock.receive(onion.id, {expiryDate: '2099-01-01'});
    const expired = await stock.receive(potato.id, {expiryDate: '2000-01-01'});
    await firstValueFrom(ingredients.saveIngredientsForRecipe('recipe', [
      {id: 'generic', recipeId: 'recipe', targetNodeId: food.id, name: 'Vegetables', amount: 150, unit: 'g'},
      {id: 'exact', recipeId: 'recipe', targetNodeId: onion.id, name: 'Onion', amount: 100, unit: 'g'}
    ]));
    const plan = await stock.planCook('recipe');
    expect(plan.ingredients.find(item => item.ingredientId === 'exact')?.deductions.map(item => item.lotId))
      .toEqual([sooner.id]);
    expect(plan.ingredients.find(item => item.ingredientId === 'generic')?.deductions.map(item => item.lotId))
      .toEqual([later.id]);
    expect(plan.ingredients.find(item => item.ingredientId === 'generic')?.missing).toBe(50);
    await stock.cook('recipe', plan);
    expect((await stock.all()).map(lot => lot.id)).toEqual([expired.id]);
  });

  it('leaves unknown and incompatible lots untouched while using known partial stock', async () => {
    const spices = await catalog.createClass('Spices');
    await catalog.save({...spices, unitConversions: {pinch: {amount: 2, unit: 'g'}}});
    const salt = catalog.productDraft({barcode: 'salt', name: 'Salt', brand: null, packageQuantity: '4 g'}, spices.id);
    const mystery = catalog.productDraft({barcode: 'mystery', name: 'Mystery salt', brand: null, packageQuantity: 'jar'}, spices.id);
    const liquid = catalog.productDraft({barcode: 'liquid', name: 'Liquid', brand: null, packageQuantity: '100 ml'}, spices.id);
    await catalog.save(salt);
    await catalog.save(mystery);
    await catalog.save(liquid);
    const known = await stock.receive(salt.id);
    const unknown = await stock.receive(mystery.id);
    const incompatible = await stock.receive(liquid.id);
    await firstValueFrom(ingredients.saveIngredientsForRecipe('recipe', [
      {id: 'salt', recipeId: 'recipe', targetNodeId: spices.id, name: 'Salt', amount: 3, unit: 'pinch'}
    ]));
    const plan = await stock.planCook('recipe');
    expect(plan.ingredients[0]).toMatchObject({used: 2, missing: 1, unknown: true});
    await stock.cook('recipe', plan);
    expect((await stock.all()).map(lot => lot.id).sort()).toEqual([unknown.id, incompatible.id].sort());
    expect((await stock.all()).some(lot => lot.id === known.id)).toBe(false);
  });

  it('retains shopping progress exactly once when an exhausted lot is deleted', async () => {
    const flour = await catalog.createClass('Flour');
    const bag = catalog.productDraft({barcode: 'flour', name: 'Flour bag', brand: null, packageQuantity: '100 g'}, flour.id);
    await catalog.save(bag);
    const entry = await shopping.addProduct('list', flour.id, {kind: 'quantity', quantity: {amount: 200, unit: 'g'}});
    const lot = await stock.receive(bag.id, {shoppingListId: 'list'});
    await firstValueFrom(ingredients.saveIngredientsForRecipe('recipe', [
      {id: 'flour', recipeId: 'recipe', targetNodeId: flour.id, name: 'Flour', amount: 100, unit: 'g'}
    ]));
    await stock.cook('recipe', await stock.planCook('recipe'));
    expect(await stock.all()).toHaveLength(0);
    let saved = (await shopping.all('list'))[0];
    expect(saved.retiredAllocations).toEqual([{lotId: lot.id, amount: 100, unit: 'g'}]);
    expect(await shopping.progress(saved)).toBe(100);
    expect(await shopping.progress(entry)).toBe(100);
    await shopping.retireAllocations(lot);
    saved = (await shopping.all('list'))[0];
    expect(await shopping.progress(saved, [lot])).toBe(100);
    await stock.receive(bag.id, {shoppingListId: 'list'});
    expect(await shopping.all('list')).toHaveLength(0);
  });

  it('requires another confirmation when stock or a conversion changes after review', async () => {
    const spices = await catalog.createClass('Spices');
    await catalog.save({...spices, unitConversions: {pinch: {amount: 1, unit: 'g'}}});
    const salt = catalog.productDraft({barcode: 'salt', name: 'Salt', brand: null, packageQuantity: '100 g'}, spices.id);
    await catalog.save(salt);
    const lot = await stock.receive(salt.id);
    await firstValueFrom(ingredients.saveIngredientsForRecipe('recipe', [
      {id: 'salt', recipeId: 'recipe', targetNodeId: salt.id, name: 'Salt', amount: 1, unit: 'pinch'}
    ]));
    const reviewed = await stock.planCook('recipe');
    await catalog.save({...spices, unitConversions: {pinch: {amount: 2, unit: 'g'}}});
    const changed = await stock.cook('recipe', reviewed);
    expect(changed.status).toBe('changed');
    expect((await stock.all())[0].remainingAmount).toBe(100);
    expect(changed.plan.ingredients[0].deductions[0].amount).toBe(2);
    await stock.cook('recipe', changed.plan);
    expect((await stock.all()).find(item => item.id === lot.id)?.remainingAmount).toBe(98);
  });

  it('rechecks a partially used lot and recipe requirements before deducting', async () => {
    const flour = await catalog.createClass('Flour');
    const bag = catalog.productDraft({barcode: 'flour', name: 'Flour bag', brand: null, packageQuantity: '100 g'}, flour.id);
    await catalog.save(bag);
    const lot = await stock.receive(bag.id);
    await firstValueFrom(ingredients.saveIngredientsForRecipe('recipe', [
      {id: 'flour', recipeId: 'recipe', targetNodeId: bag.id, name: 'Flour', amount: 80, unit: 'g'}
    ]));
    const reviewed = await stock.planCook('recipe');
    await stock.save({...lot, remainingAmount: 50});
    const changedStock = await stock.cook('recipe', reviewed);
    expect(changedStock.status).toBe('changed');
    expect(changedStock.plan.ingredients[0]).toMatchObject({used: 50, missing: 30});
    await firstValueFrom(ingredients.saveIngredientsForRecipe('recipe', [
      {id: 'flour', recipeId: 'recipe', targetNodeId: bag.id, name: 'Flour', amount: 40, unit: 'g'}
    ]));
    const changedRecipe = await stock.cook('recipe', changedStock.plan);
    expect(changedRecipe.status).toBe('changed');
    await stock.cook('recipe', changedRecipe.plan);
    expect((await stock.all())[0].remainingAmount).toBe(10);
  });

  it.each([
    ['receipt order', 'a-first', 'z-second'],
    ['reverse receipt order', 'z-first', 'a-second']
  ])('resumes an interrupted cook without applying completed changes twice (%s)', async (_, firstId, secondId) => {
    const flour = await catalog.createClass('Flour');
    const bag = catalog.productDraft({barcode: 'flour', name: 'Flour bag', brand: null, packageQuantity: '100 g'}, flour.id);
    await catalog.save(bag);
    const first = await stock.receive(bag.id, {scanId: firstId});
    const second = await stock.receive(bag.id, {scanId: secondId});
    // Exercise the lot ID tie-breaker without depending on wall-clock timing.
    await stock.save({...first, createdAt: 1});
    await stock.save({...second, createdAt: 1});
    await firstValueFrom(ingredients.saveIngredientsForRecipe('recipe', [
      {id: 'flour', recipeId: 'recipe', targetNodeId: bag.id, name: 'Flour', amount: 150, unit: 'g'}
    ]));
    const reviewed = await stock.planCook('recipe');
    const exhaustedId = [firstId, secondId].sort()[0];
    const partialId = [firstId, secondId].sort()[1];
    expect(reviewed.ingredients[0].deductions.map(item => [item.lotId, item.amount]))
      .toEqual([[exhaustedId, 100], [partialId, 50]]);
    const actualSave = stock.save.bind(stock);
    let attempts = 0;
    const spy = jest.spyOn(stock, 'save').mockImplementation(async lot => {
      if (++attempts === 1) throw new Error('temporary write failure');
      return actualSave(lot);
    });
    await expect(stock.cook('recipe', reviewed)).rejects.toThrow('temporary write failure');
    spy.mockRestore();
    // The exhausted lot was removed before the partial-lot write failed.
    expect((await stock.all()).find(lot => lot.id === exhaustedId)).toBeUndefined();
    expect((await stock.all()).find(lot => lot.id === partialId)?.remainingAmount).toBe(100);
    expect((await stock.cook('recipe', reviewed)).status).toBe('cooked');
    expect((await stock.all()).find(lot => lot.id === exhaustedId)).toBeUndefined();
    expect((await stock.all()).find(lot => lot.id === partialId)?.remainingAmount).toBe(50);
  });

  it('finishes a confirmed cook left pending when stock is next opened', async () => {
    const flour = await catalog.createClass('Flour');
    const bag = catalog.productDraft({barcode: 'flour', name: 'Flour bag', brand: null, packageQuantity: '100 g'}, flour.id);
    await catalog.save(bag);
    const lot = await stock.receive(bag.id);
    await db['settings'].upsert({key: 'cook:pending', value: JSON.stringify([{lotId: lot.id, remainingAmount: 25}])});
    const reopened = TestBed.runInInjectionContext(() => new StockService());
    expect((await reopened.all())[0].remainingAmount).toBe(25);
    expect(await db['settings'].findOne('cook:pending').exec()).toBeNull();
  });
});
