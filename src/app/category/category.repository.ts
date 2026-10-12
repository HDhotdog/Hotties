import {inject, Injectable} from '@angular/core';
import {from, map, Observable, switchMap} from 'rxjs';
import {RxDocument} from 'rxdb';
import {RxCategory} from './category';
import {DatabaseService} from '../database/database';
import {AbstractRepository} from '../database/abstract-repository';

@Injectable({
  providedIn: 'root',
})
export class CategoryRepository extends AbstractRepository<RxCategory> {
  protected override database: DatabaseService;

  protected override collectionName: string = 'categories';

  public override saveAll(categories: RxCategory[]): Observable<RxDocument<RxCategory>[]> {
    return this.getCollection().pipe(
      switchMap(collection => from(collection.bulkUpsert(categories))),
      map(result => {
        if (result.error.length) throw new Error('Could not save the shopping list order.');
        return result.success;
      })
    );
  }

  constructor() {
    const database = inject(DatabaseService);

    super(database);

    this.database = database;
  }
}
