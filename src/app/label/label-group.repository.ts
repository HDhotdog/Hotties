import { Injectable, inject } from '@angular/core';
import { RxLabelGroup } from './models/label';
import { AbstractRepository } from '../database/abstract-repository';
import { DatabaseService } from '../database/database';

@Injectable({
  providedIn: 'root',
})
export class LabelGroupRepository extends AbstractRepository<RxLabelGroup> {
  protected override database: DatabaseService;

  protected override collectionName: string = 'label_groups';

  constructor() {
    const database = inject(DatabaseService);

    super(database);

    this.database = database;
  }

  // public findUniqueLabelGroups(): Observable<RxLabelGroup[]> {
  //   return this.getCollection().pipe(
  //     switchMap(col => col.find().$),
  //     map(lableGroups => {
  //       const byName = new Map<string, RxLabelGroup>();
  //       for (const labelGroup of lableGroups) {
  //         if (!byName.has(labelGroup.name)) {
  //           byName.set(labelGroup.name, labelGroup);
  //         }
  //       }
  //       return Array.from(byName.values());
  //     })
  //   );
  // }

  // public findByRecipeId(recipeId: string): Observable<RxLabel[]> {
  //   return this.getCollection().pipe(
  //     switchMap(col =>
  //       col.find({
  //         selector: {recipeId}
  //       }).$
  //     )
  //   );
  // }
  //
  // public findDistinctNames(): Observable<string[]> {
  //   return this.getCollection().pipe(
  //     switchMap(col => col.find().$),
  //     map(labels => [...new Set(labels.map(l => l.name))])
  //   );
  // }
}
