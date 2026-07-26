import { Injectable, inject } from '@angular/core';
import { RxItem } from './rxItem';
import { DatabaseService } from '../database/database';
import { AbstractRepository } from '../database/abstract-repository';
import { from, Observable, switchMap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ItemRepository extends AbstractRepository<RxItem> {
  protected override database: DatabaseService;

  protected override collectionName: string = 'items';

  constructor() {
    const database = inject(DatabaseService);

    super(database);

    this.database = database;
  }

  /**
   * One-shot snapshot (not live) - used by findOrCreateByName's match-or-create
   * check. A live query here never completes, so a plain .subscribe() on it
   * (as every save() caller does) leaks forever; since it also re-fires on every
   * future write to this collection, that leaked subscription re-runs its
   * downstream save with a stale closure - including upserting a since-deleted
   * todo/fridge-item id back into existence. See docs/ITEM-ENTITY-PLAN.md.
   */
  public findAllOnce(): Observable<RxItem[]> {
    return this.getCollection().pipe(
      switchMap((col) => from(col.find().exec()))
    );
  }
}
