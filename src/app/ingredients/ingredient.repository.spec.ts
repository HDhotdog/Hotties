import {firstValueFrom} from 'rxjs';
import {RxDatabase} from 'rxdb';
import {TestBed} from '@angular/core/testing';
import {createTestDatabase} from '../database/test-support/create-test-database';
import {DatabaseService} from '../database/database';
import {IngredientRepository} from './ingredient.repository';
import {RxIngredient} from './ingredient';

describe('IngredientRepository (integration, in-memory RxDB)', () => {
  let db: RxDatabase;
  let repository: IngredientRepository;

  beforeEach(async () => {
    const testDb = await createTestDatabase();
    db = testDb.db;
    TestBed.configureTestingModule({
      providers: [{provide: DatabaseService, useValue: testDb.accessor}]
    });
    repository = TestBed.inject(IngredientRepository);
  });

  afterEach(async () => {
    await db.close();
  });

  const ingredient = (overrides: Partial<RxIngredient> = {}): RxIngredient => ({
    id: 'i1',
    recipeId: 'recipe-1',
    name: 'Milk',
    itemId: null,
    ...overrides
  });

  it('findByRecipeId() only returns ingredients for that recipe', async () => {
    await firstValueFrom(repository.saveAll([
      ingredient({id: 'i1', recipeId: 'recipe-1', name: 'Milk'}),
      ingredient({id: 'i2', recipeId: 'recipe-1', name: 'Eggs'}),
      ingredient({id: 'i3', recipeId: 'recipe-2', name: 'Flour'})
    ]));

    const recipe1Ingredients = await firstValueFrom(repository.findByRecipeId('recipe-1'));

    expect(recipe1Ingredients.map(i => i.id).sort()).toEqual(['i1', 'i2']);
  });

  it('deleteByRecipeId() removes only that recipe\'s ingredients', async () => {
    await firstValueFrom(repository.saveAll([
      ingredient({id: 'i1', recipeId: 'recipe-1'}),
      ingredient({id: 'i2', recipeId: 'recipe-1'}),
      ingredient({id: 'i3', recipeId: 'recipe-2'})
    ]));

    const deletedCount = await firstValueFrom(repository.deleteByRecipeId('recipe-1'));

    expect(deletedCount).toBe(2);
    const remainingIds = (await firstValueFrom(repository.findAll())).map(i => i.id);
    expect(remainingIds).toEqual(['i3']);
  });
});
