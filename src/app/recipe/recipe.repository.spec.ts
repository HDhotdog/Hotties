import {firstValueFrom} from 'rxjs';
import {RxDatabase} from 'rxdb';
import {createTestDatabase} from '../database/test-support/create-test-database';
import {DatabaseService} from '../database/database';
import {RecipeRepository} from './recipe.repository';
import {RxRecipe} from './models/recipe';

describe('RecipeRepository (integration, in-memory RxDB)', () => {
  let db: RxDatabase;
  let repository: RecipeRepository;

  beforeEach(async () => {
    const testDb = await createTestDatabase();
    db = testDb.db;
    repository = new RecipeRepository(testDb.accessor as unknown as DatabaseService);
  });

  afterEach(async () => {
    await db.close();
  });

  it('save() then findById() round-trips a recipe', async () => {
    const recipe: RxRecipe = {id: 'r1', name: 'Pancakes', description: 'Fluffy', preparationTime: 20};

    await firstValueFrom(repository.save(recipe));
    const found = await firstValueFrom(repository.findById('r1'));

    expect(found).toMatchObject(recipe);
  });

  it('deleteById() removes the recipe', async () => {
    const recipe: RxRecipe = {id: 'r1', name: 'Pancakes', description: 'Fluffy', preparationTime: 20};
    await firstValueFrom(repository.save(recipe));

    const deleted = await firstValueFrom(repository.deleteById('r1'));

    expect(deleted).toBe(true);
    const all = await firstValueFrom(repository.findAll());
    expect(all).toEqual([]);
  });
});
