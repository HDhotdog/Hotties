import {Injectable} from "@angular/core";
import {RxLabel} from "./models/label";
import {from, map, Observable, switchMap} from "rxjs";
import {AbstractRepository} from "../database/abstract-repository";
import {DatabaseService} from "../database/database";

@Injectable({
  providedIn: 'root'
})
export class LabelRepository extends AbstractRepository<RxLabel> {
  protected override collectionName: string = "labels";

  constructor(protected override database: DatabaseService) {
    super(database);
  }

  public findByRecipeId(recipeId: string): Observable<RxLabel[]> {
    return this.getCollection().pipe(
      switchMap(col =>
        col.find({
          selector: {recipeId}
        }).$
      )
    );
  }

  public findDistinctNames(): Observable<string[]> {
    return this.getCollection().pipe(
      switchMap(col => col.find().$),
      map(labels => [...new Set(labels.map(l => l.name))])
    );
  }

  public findUniqueLabels(): Observable<RxLabel[]> {
    return this.getCollection().pipe(
      switchMap(col => col.find().$),
      map(labels => {
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

  // col.find({
  //            selector: {categoryId}
  //          }).$

  public deleteByLabelGroupId(groupId: string): Observable<number> {
    return this.getCollection().pipe(
      switchMap(col =>
        from(col.find({ selector: { groupId } }).remove())
      ),
      map(deletedDocs => deletedDocs.length) // return number of deleted docs
    );
  }

  public deleteByRecipeId(recipeId: string): Observable<number> {
    return this.getCollection().pipe(
      switchMap(col =>
        from(col.find({ selector: { recipeId } }).remove())
      ),
      map(deletedDocs => deletedDocs.length)
    );
  }
}


  // public saveAll(labelGroups: RxLabelGroup[]) {
  //     Preferences.set({ key: this.LABEL_STORAGE, value: JSON.stringify(labelGroups) })
  //         .then(() => console.log('Label groups saved successfully!'))
  //         .catch((error) => console.error('Error saving label groups:', error));
  // }
  //
  // public findAll(): Observable<RxLabelGroup[]> {
  //     return from(Preferences.get({key: this.LABEL_STORAGE})).pipe(
  //         map(({value}) => (value ? JSON.parse(value) : []) as RxLabelGroup[]),
  //         catchError((error) => {
  //             console.error('Error getting label groups:', error);
  //             return of([]);
  //         })
  //     );
  // }
  //
  // public deleteAll(): Observable<void> {
  //     return from(Preferences.remove({key: this.LABEL_STORAGE}));
  // }
  //
  // public delete(labelGroup: RxLabelGroup): Observable<RxLabelGroup[]> {
  //     return this.findAll().pipe(
  //         map((labelGroups) => labelGroups.filter((lab) => lab.id !== labelGroup.id)),
  //         tap((labelGroups) => Preferences.set({key: this.LABEL_STORAGE, value: JSON.stringify(labelGroups)}))
  //     );
  // }

