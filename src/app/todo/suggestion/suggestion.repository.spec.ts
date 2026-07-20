import {firstValueFrom} from 'rxjs';
import {RxDatabase} from 'rxdb';
import {TestBed} from '@angular/core/testing';
import {createTestDatabase} from '../../database/test-support/create-test-database';
import {DatabaseService} from '../../database/database';
import {SuggestionRepository} from './suggestion.repository';
import {RxSuggestion} from './rxSuggestion';

describe('SuggestionRepository (integration, in-memory RxDB)', () => {
  let db: RxDatabase;
  let repository: SuggestionRepository;

  beforeEach(async () => {
    const testDb = await createTestDatabase();
    db = testDb.db;
    TestBed.configureTestingModule({
      providers: [{provide: DatabaseService, useValue: testDb.accessor}]
    });
    repository = TestBed.inject(SuggestionRepository);
  });

  afterEach(async () => {
    await db.close();
  });

  const suggestion = (overrides: Partial<RxSuggestion> = {}): RxSuggestion => ({
    id: 's1',
    categoryId: 'cat-1',
    suggestion: 'Cookies',
    suffix: '!',
    ...overrides
  });

  it('findByCategoryId() only returns suggestions for that category', async () => {
    await firstValueFrom(repository.saveAll([
      suggestion({id: 's1', categoryId: 'cat-1', suggestion: 'Cookies'}),
      suggestion({id: 's2', categoryId: 'cat-1', suggestion: 'Milk'}),
      suggestion({id: 's3', categoryId: 'cat-2', suggestion: 'Bread'})
    ]));

    const cat1Suggestions = await firstValueFrom(repository.findByCategoryId('cat-1'));

    expect(cat1Suggestions.map(s => s.id).sort()).toEqual(['s1', 's2']);
  });
});
