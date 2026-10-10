import {inject, Injectable} from '@angular/core';
import {RxToDo} from './rxToDo';
import {DatabaseService} from '../database/database';
import {AbstractRepository} from '../database/abstract-repository';
import {from, map, Observable, switchMap} from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TodoRepository extends AbstractRepository<RxToDo> {
  protected override database: DatabaseService;

  protected override collectionName: string = 'todos';

  constructor() {
    const database = inject(DatabaseService);

    super(database);

    this.database = database;
  }

  public findByCategoryId(categoryId: string): Observable<RxToDo[]> {
    return this.getCollection().pipe(
      switchMap(
        (col) =>
          col.find({
            selector: {categoryId},
          }).$
      ),
      map((docs) =>
        [...docs].sort((a, b) => a._data._meta.lwt - b._data._meta.lwt)
      )
    );
  }

  /** One-shot check (not live) - used by ItemService to decide whether an item
   * can be deleted; a live query here would leak a subscription on every check. */
  public findByItemId(itemId: string): Observable<RxToDo[]> {
    return this.getCollection().pipe(
      switchMap((col) => from(col.find({selector: {itemId}}).exec()))
    );
  }

  public deleteByCategoryId(categoryId: string): Observable<number> {
    return this.getCollection().pipe(
      switchMap((col) => from(col.find({selector: {categoryId}}).remove())),
      map((deletedDocs) => deletedDocs.length)
    );
  }
}
