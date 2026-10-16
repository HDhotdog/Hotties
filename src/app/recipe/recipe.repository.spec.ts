import {filter, firstValueFrom, ReplaySubject, skip, timeout} from 'rxjs';
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

  it('round-trips ordered step instructions and recipe ingredient references', async () => {
    const recipe: RxRecipe = {
      id: 'steps', name: 'Soup', description: 'Recipe notes', preparationTime: 20,
      steps: [{id: 'prep', instructions: 'Chop.\nThen slice.', ingredientIds: ['onion', 'salt']},
        {id: 'cook', instructions: 'Season.', ingredientIds: ['salt']}]
    };
    await firstValueFrom(repository.save(recipe));
    expect(await firstValueFrom(repository.findById(recipe.id))).toMatchObject(recipe);
  });

  it('observes edits on the same subscription and emits null when a recipe is deleted', async () => {
    const changes = new ReplaySubject<RxRecipe | null>(1);
    const subscription = repository.observeById('live').subscribe(changes);
    const nextMatching = (predicate: (recipe: RxRecipe | null) => boolean) =>
      firstValueFrom(changes.pipe(filter(predicate), timeout(1500)));
    try {
      expect(await nextMatching(recipe => recipe === null)).toBeNull();
      const recipe = {id: 'live', name: 'Soup', description: '', preparationTime: 10};
      await firstValueFrom(repository.save(recipe));
      expect(await nextMatching(current => current?.name === 'Soup')).toMatchObject(recipe);
      const edited = {...recipe, name: 'Updated soup', description: 'New notes', preparationTime: 25, emoji: '🍲',
        steps: [{id: 'cook', instructions: 'Simmer.', ingredientIds: []}]};
      await firstValueFrom(repository.save(edited));
      expect(await nextMatching(current => current?.description === 'New notes')).toMatchObject(edited);
      await firstValueFrom(repository.deleteById(recipe.id));
      expect(await nextMatching(current => current === null)).toBeNull();
    } finally {
      subscription.unsubscribe();
    }
  });

  it('observes image addition, replacement and removal without reloading images for text edits', async () => {
    const recipe = {id: 'live-image', name: 'Soup', description: '', preparationTime: 10};
    await firstValueFrom(repository.save(recipe));
    const changes = new ReplaySubject<Blob | null>(1);
    const emitted: (Blob | null)[] = [];
    const subscription = repository.observeImage(recipe.id).subscribe(image => { emitted.push(image); changes.next(image); });
    const next = () => firstValueFrom(changes.pipe(skip(1), timeout(1500)));
    try {
      expect(await firstValueFrom(changes.pipe(timeout(1500)))).toBeNull();
      const first = next();
      await firstValueFrom(repository.saveImage(recipe.id, new Blob(['first'], {type: 'image/png'})));
      expect(await (await first)?.text()).toBe('first');
      const beforeTextEdit = emitted.length;
      await firstValueFrom(repository.save({...recipe, description: 'Added notes'}));
      await firstValueFrom(repository.observeById(recipe.id).pipe(filter(current => current?.description === 'Added notes'), timeout(1500)));
      expect(emitted).toHaveLength(beforeTextEdit);
      const replacement = next();
      await firstValueFrom(repository.saveImage(recipe.id, new Blob(['replacement'], {type: 'image/png'})));
      expect(await (await replacement)?.text()).toBe('replacement');
      const removed = next();
      await firstValueFrom(repository.deleteImage(recipe.id));
      expect(await removed).toBeNull();
    } finally {
      subscription.unsubscribe();
    }
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
