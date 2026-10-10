import {inject, Injectable} from '@angular/core';
import {RxFridgeItem} from './rxFridgeItem';
import {DatabaseService} from '../database/database';
import {AbstractRepository} from '../database/abstract-repository';
import {from, Observable, switchMap} from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FridgeItemRepository extends AbstractRepository<RxFridgeItem> {
  protected override database: DatabaseService;

  protected override collectionName: string = 'fridge_items';

  constructor() {
    const database = inject(DatabaseService);

    super(database);

    this.database = database;
  }

  /** One-shot check (not live) - used by ItemService to decide whether an item
   * can be deleted; a live query here would leak a subscription on every check. */
  public findByItemId(itemId: string): Observable<RxFridgeItem[]> {
    return this.getCollection().pipe(
      switchMap((col) => from(col.find({selector: {itemId}}).exec()))
    );
  }
}
