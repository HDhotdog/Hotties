import {TestBed} from '@angular/core/testing';
import {filter, firstValueFrom, throwError, timeout} from 'rxjs';
import {RxDatabase} from 'rxdb';
import {getRxStorageMemory} from 'rxdb/plugins/storage-memory';
import {v4 as uuidv4} from 'uuid';
import {createHottiesDatabase, DatabaseService} from '../database/database';
import {LabelService} from './label-service.service';
import {LabelRepository} from './label.repository';
import {createTestDatabase} from '../database/test-support/create-test-database';

describe('LabelService ordering (integration, in-memory RxDB)', () => {
  it('retains group and label order after the database is reopened, and appends a new label', async () => {
    const storage = getRxStorageMemory();
    const name = `test-label-order-${uuidv4()}`;
    let db: RxDatabase = await createHottiesDatabase(storage, name, false);
    TestBed.configureTestingModule({providers: [{provide: DatabaseService, useValue: {getDb: async () => db}}]});
    const service = TestBed.inject(LabelService);
    try {
      await firstValueFrom(service.saveAllGroups([
        {id: 'order-group-b', name: 'B', sortOrder: 0},
        {id: 'order-group-a', name: 'A', sortOrder: 1},
      ]));
      await firstValueFrom(service.saveAllLabels([
        {id: 'order-label-b', name: 'Second alphabetically', groupId: 'order-group-b', recipeId: '', sortOrder: 0},
        {id: 'order-label-a', name: 'First alphabetically', groupId: 'order-group-b', recipeId: '', sortOrder: 1},
      ]));
      await db.close();
      db = await createHottiesDatabase(storage, name, false);
      const groups = (await firstValueFrom(service.getAllLabelGroups())).filter(group => group.id.startsWith('order-'));
      expect(groups.map(group => group.id)).toEqual(['order-group-b', 'order-group-a']);
      const labels = (await firstValueFrom(service.getAllLabels())).filter(label => label.groupId === 'order-group-b');
      expect(labels.map(label => label.id)).toEqual(['order-label-b', 'order-label-a']);
      await firstValueFrom(service.saveLabel({
        id: 'order-label-new', name: 'New label', groupId: 'order-group-b', recipeId: '', sortOrder: 2,
      }));
      expect((await firstValueFrom(service.getTemplateLabels()))
        .filter(label => label.groupId === 'order-group-b').map(label => label.id))
        .toEqual(['order-label-b', 'order-label-a', 'order-label-new']);
    } finally {
      await db.close();
    }
  });
});


describe('LabelService deletion (integration, in-memory RxDB)', () => {
  let db: RxDatabase;
  let service: LabelService;

  beforeEach(async () => {
    const testDb = await createTestDatabase(false);
    db = testDb.db;
    TestBed.configureTestingModule({providers: [{provide: DatabaseService, useValue: testDb.accessor}]});
    service = TestBed.inject(LabelService);
    await firstValueFrom(service.saveAllGroups([
      {id: 'taste', name: 'Geschmack'}, {id: 'other-taste', name: 'Other taste'},
    ]));
    await firstValueFrom(service.saveAllLabels([
      {id: 'salty', groupId: 'taste', recipeId: '', name: 'Salzig'},
      {id: 'sour', groupId: 'taste', recipeId: '', name: 'Sauer'},
      {id: 'recipe-one-salty', groupId: 'taste', recipeId: 'recipe-one', name: 'Salzig'},
      {id: 'recipe-two-salty', groupId: 'taste', recipeId: 'recipe-two', name: 'Salzig'},
      {id: 'recipe-one-sour', groupId: 'taste', recipeId: 'recipe-one', name: 'Sauer'},
      {id: 'other-salty', groupId: 'other-taste', recipeId: '', name: 'Salzig'},
      {id: 'recipe-one-other-salty', groupId: 'other-taste', recipeId: 'recipe-one', name: 'Salzig'},
    ]));
  });

  afterEach(async () => {
    await db.close();
  });

  it('deletes a label definition and its copies on every recipe, keeping unrelated labels', async () => {
    const liveRecipeUpdate = firstValueFrom(service.getLabelsForRecipe('recipe-two').pipe(
      filter(labels => labels.length === 0), timeout(2000)
    ));
    expect(await firstValueFrom(service.deleteLabelById('salty'))).toBe(true);
    expect(await liveRecipeUpdate).toEqual([]);
    const remaining = (await firstValueFrom(service.getAllLabels())).map(label => label.id);
    expect(remaining).not.toContain('salty');
    expect(remaining).not.toContain('recipe-one-salty');
    expect(remaining).not.toContain('recipe-two-salty');
    expect(remaining).toEqual(expect.arrayContaining([
      'sour', 'recipe-one-sour', 'other-salty', 'recipe-one-other-salty',
    ]));
    expect((await firstValueFrom(service.getLabelsForRecipe('recipe-one'))).map(label => label.id))
      .toEqual(expect.arrayContaining(['recipe-one-sour', 'recipe-one-other-salty']));
    expect(await firstValueFrom(service.getLabelsForRecipe('recipe-two'))).toEqual([]);
    expect(await firstValueFrom(service.deleteLabelById('salty'))).toBe(false);
  });

  it('deletes all definitions and recipe assignments in a group before deleting the group', async () => {
    expect(await firstValueFrom(service.deleteLabelGroupById('taste'))).toBe(true);
    expect((await firstValueFrom(service.getAllLabels())).filter(label => label.groupId === 'taste')).toEqual([]);
    expect((await firstValueFrom(service.getAllLabelGroups())).some(group => group.id === 'taste')).toBe(false);
    expect((await firstValueFrom(service.getAllLabels())).filter(label => label.groupId === 'other-taste').map(label => label.id))
      .toEqual(expect.arrayContaining(['other-salty', 'recipe-one-other-salty']));
    expect(await firstValueFrom(service.getLabelsForRecipe('recipe-two'))).toEqual([]);
  });

  it.each(['label', 'group'])('does not recreate a deleted %s when a cached recipe editor saves old assignments', async target => {
    const cachedLabels = await firstValueFrom(service.getLabelsForRecipe('recipe-one'));
    await firstValueFrom(target === 'label' ? service.deleteLabelById('salty') : service.deleteLabelGroupById('taste'));
    await firstValueFrom(service.saveLabelsForRecipe('recipe-one', cachedLabels));
    expect((await firstValueFrom(service.getLabelsForRecipe('recipe-one'))).map(label => label.id).sort())
      .toEqual(target === 'label' ? ['recipe-one-other-salty', 'recipe-one-sour'] : ['recipe-one-other-salty']);
    expect(await firstValueFrom(service.getLabelsForRecipe('recipe-two'))).toEqual([]);
  });

  it('keeps a group when removing its labels fails', async () => {
    jest.spyOn(TestBed.inject(LabelRepository), 'deleteByLabelGroupId')
      .mockReturnValue(throwError(() => new Error('deletion failed')));
    await expect(firstValueFrom(service.deleteLabelGroupById('taste'))).rejects.toThrow('deletion failed');
    expect((await firstValueFrom(service.getAllLabelGroups())).some(group => group.id === 'taste')).toBe(true);
    expect((await firstValueFrom(service.getLabelsForRecipe('recipe-two'))).map(label => label.id))
      .toEqual(['recipe-two-salty']);
  });

  it('removes only that assignment when deleting a recipe-specific label directly', async () => {
    expect(await firstValueFrom(service.deleteLabelById('recipe-one-salty'))).toBe(true);
    const remaining = (await firstValueFrom(service.getAllLabels())).map(label => label.id);
    expect(remaining).not.toContain('recipe-one-salty');
    expect(remaining).toEqual(expect.arrayContaining(['salty', 'recipe-two-salty']));
  });
});
