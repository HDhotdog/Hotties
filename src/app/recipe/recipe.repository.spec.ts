import {firstValueFrom} from 'rxjs';
import {RxDatabase} from 'rxdb';
import {TestBed} from '@angular/core/testing';
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
    TestBed.configureTestingModule({
      providers: [{provide: DatabaseService, useValue: testDb.accessor}]
    });
    repository = TestBed.inject(RecipeRepository);
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

  it('getImage() returns null when no image was saved', async () => {
    const recipe: RxRecipe = {id: 'r1', name: 'Pancakes', description: 'Fluffy', preparationTime: 20};
    await firstValueFrom(repository.save(recipe));

    const image = await firstValueFrom(repository.getImage('r1'));

    expect(image).toBeNull();
  });

  it('saveImage() then getImage() round-trips the attachment', async () => {
    const recipe: RxRecipe = {id: 'r1', name: 'Pancakes', description: 'Fluffy', preparationTime: 20};
    await firstValueFrom(repository.save(recipe));
    const blob = new Blob(['fake-image-data'], {type: 'image/png'});

    await firstValueFrom(repository.saveImage('r1', blob));
    const image = await firstValueFrom(repository.getImage('r1'));

    expect(image).not.toBeNull();
    expect(image!.type).toBe('image/png');
    expect(await image!.text()).toBe('fake-image-data');
  });

  it('deleteImage() removes a previously saved attachment', async () => {
    const recipe: RxRecipe = {id: 'r1', name: 'Pancakes', description: 'Fluffy', preparationTime: 20};
    await firstValueFrom(repository.save(recipe));
    const blob = new Blob(['fake-image-data'], {type: 'image/png'});
    await firstValueFrom(repository.saveImage('r1', blob));

    await firstValueFrom(repository.deleteImage('r1'));
    const image = await firstValueFrom(repository.getImage('r1'));

    expect(image).toBeNull();
  });
});
