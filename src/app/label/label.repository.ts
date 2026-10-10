import {inject, Injectable} from '@angular/core';
import {RxLabel} from './models/label';
import {from, map, Observable, switchMap} from 'rxjs';
import {AbstractRepository} from '../database/abstract-repository';
import {DatabaseService} from '../database/database';

@Injectable({
  providedIn: 'root',
})
export class LabelRepository extends AbstractRepository<RxLabel> {
  protected override database: DatabaseService;

  protected override collectionName: string = 'labels';

  constructor() {
    const database = inject(DatabaseService);

    super(database);

    this.database = database;
  }

  public findByRecipeId(recipeId: string): Observable<RxLabel[]> {
    return this.getCollection().pipe(
      switchMap(
        (col) =>
          col.find({
            selector: {recipeId},
          }).$
      )
    );
  }

  public findDistinctNames(): Observable<string[]> {
    return this.getCollection().pipe(
      switchMap((col) => col.find().$),
      map((labels) => [...new Set(labels.map((l) => l.name))])
    );
  }

  public findUniqueLabels(): Observable<RxLabel[]> {
    return this.getCollection().pipe(
      switchMap((col) => col.find().$),
      map((labels) => {
        const byName = new Map<string, RxLabel>();
        for (const label of labels) {
          if (!byName.has(label.name)) {
            byName.set(label.name, label);
          }
        }
        return Array.from(byName.values());
      })
    );
  }

  public deleteByLabelGroupId(groupId: string): Observable<number> {
    return this.getCollection().pipe(
      switchMap((col) => from(col.find({selector: {groupId}}).remove())),
      map((deletedDocs) => deletedDocs.length) // return number of deleted docs
    );
  }

  public deleteByRecipeId(recipeId: string): Observable<number> {
    return this.getCollection().pipe(
      switchMap((col) => from(col.find({selector: {recipeId}}).remove())),
      map((deletedDocs) => deletedDocs.length)
    );
  }
}
