import {AbstractRepository} from '../database/abstract-repository';
import {RxIngredient} from './ingredient';
import {DatabaseService} from '../database/database';
import {from, map, Observable, switchMap} from 'rxjs';
import {inject, Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class IngredientRepository extends AbstractRepository<RxIngredient> {
  protected override database: DatabaseService;

  protected override collectionName: string = 'ingredients';

  constructor() {
    const database = inject(DatabaseService);

    super(database);

    this.database = database;
  }

  public findByRecipeId(recipeId: string): Observable<RxIngredient[]> {
    return this.getCollection().pipe(
      switchMap(
        (col) =>
          col.find({
            selector: {recipeId},
          }).$
      )
    );
  }

  /** One-shot check (not live) - used by ItemService.deleteById to decide whether
   * an item can be deleted; a live query here would leak a subscription on every
   * delete attempt. */
  public findByItemId(itemId: string): Observable<RxIngredient[]> {
    return this.getCollection().pipe(
      switchMap(
        (col) =>
          from(col.find({
            selector: {itemId},
          }).exec())
      )
    );
  }

  public deleteByRecipeId(recipeId: string): Observable<number> {
    return this.getCollection().pipe(
      switchMap((col) => from(col.find({selector: {recipeId}}).remove())),
      map((deletedDocs) => deletedDocs.length)
    );
  }
}
