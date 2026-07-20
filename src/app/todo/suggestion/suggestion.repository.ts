import { Injectable, inject } from '@angular/core';
import { AbstractRepository } from '../../database/abstract-repository';
import { DatabaseService } from '../../database/database';
import { RxSuggestion } from './rxSuggestion';
import { Observable, switchMap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SuggestionRepository extends AbstractRepository<RxSuggestion> {
  protected override database: DatabaseService;

  protected override collectionName: string = 'suggestions';

  constructor() {
    const database = inject(DatabaseService);

    super(database);

    this.database = database;
  }

  public findByCategoryId(categoryId: string): Observable<RxSuggestion[]> {
    return this.getCollection().pipe(
      switchMap(
        (col) =>
          col.find({
            selector: { categoryId },
          }).$
      )
    );
  }
}
