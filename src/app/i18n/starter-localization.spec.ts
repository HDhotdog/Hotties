import {TestBed} from '@angular/core/testing';
import {firstValueFrom} from 'rxjs';
import {RxDatabase} from 'rxdb';
import {createTestDatabase} from '../database/test-support/create-test-database';
import {DatabaseService} from '../database/database';
import {CATALOG_SCHEMA_LITERAL} from '../database/schema/catalog.schema';
import {LABEL_SCHEMA_LITERAL} from '../database/schema/label.schema';
import {LABEL_GROUP_SCHEMA_LITERAL} from '../database/schema/label-groups.schema';
import {LabelService} from '../label/label-service.service';
import {LocalizationService} from './localization.service';

describe('Starter localization', () => {
  it('preserves all unmarked existing records without inferring their origin', () => {
    expect(CATALOG_SCHEMA_LITERAL.migrationStrategies[2]({id: 'root-food', name: 'Food'}))
      .toEqual({id: 'root-food', name: 'Food'});
    expect(CATALOG_SCHEMA_LITERAL.migrationStrategies[2]({id: 'root-food', name: 'Custom root'}))
      .toEqual({id: 'root-food', name: 'Custom root'});
    expect(CATALOG_SCHEMA_LITERAL.migrationStrategies[2]({id: 'custom', name: 'Food'})).toEqual({id: 'custom', name: 'Food'});
    const old = {id: 'old', name: 'Frühstück'};
    expect(LABEL_SCHEMA_LITERAL.migrationStrategies[2](old)).toEqual(old);
    expect(LABEL_GROUP_SCHEMA_LITERAL.migrationStrategies[2](old)).toEqual(old);
  });
  it('preserves metadata through assignment and removes it from all copies after a real rename', async () => {
    const testDb = await createTestDatabase(false);
    const db: RxDatabase = testDb.db;
    TestBed.configureTestingModule({providers: [{provide: DatabaseService, useValue: testDb.accessor}]});
    const labels = TestBed.inject(LabelService);
    const i18n = TestBed.inject(LocalizationService);
    try {
      const template = (await firstValueFrom(labels.getTemplateLabels())).find(label => label.translationKey === 'starter.breakfast')!;
      expect(template.origin).toBe('app');
      await firstValueFrom(labels.saveLabelsForRecipe('recipe', [{...template, id: 'recipe-label', recipeId: 'recipe'}]));
      const copy = (await firstValueFrom(labels.getLabelsForRecipe('recipe')))[0];
      expect(copy.origin).toBe('app');
      expect(copy.translationKey).toBe('starter.breakfast');
      await i18n.setLanguage('de');
      expect(i18n.name(copy)).toBe('Frühstück');
      const customized = {...template};
      delete customized.translationKey;
      await firstValueFrom(labels.saveLabel(customized));
      const canonicalRename = (await firstValueFrom(labels.getLabelsForRecipe('recipe')))[0];
      expect(canonicalRename.translationKey).toBeUndefined();
      expect(canonicalRename.origin).toBe('app');
      expect(canonicalRename.name).toBe(template.name);
      await firstValueFrom(labels.saveLabel({...customized, name: 'My breakfast'}));
      const renamed = (await firstValueFrom(labels.getLabelsForRecipe('recipe')))[0];
      expect(renamed.name).toBe('My breakfast');
      expect(renamed.origin).toBe('app');
      expect(renamed.translationKey).toBeUndefined();
      await firstValueFrom(labels.saveLabelsForRecipe('recipe', [copy]));
      const afterStaleSave = (await firstValueFrom(labels.getLabelsForRecipe('recipe')))[0];
      expect(afterStaleSave.name).toBe('My breakfast');
      expect(afterStaleSave.translationKey).toBeUndefined();
      await i18n.setLanguage('en');
      expect(i18n.name(renamed)).toBe('My breakfast');
      await firstValueFrom(labels.deleteLabelById(template.id));
      expect(await firstValueFrom(labels.getLabelsForRecipe('recipe'))).toEqual([]);
    } finally {await db.close();}
  });
});
