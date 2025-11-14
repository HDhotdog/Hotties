import {Injectable} from "@angular/core";
import {AbstractRepository} from "../../database/abstract-repository";
import {DatabaseService} from "../../database/database";
import {RxSuggestion} from "./rxSuggestion";
import {Observable, switchMap} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class SuggestionRepository extends AbstractRepository<RxSuggestion> {
  protected override collectionName: string = "suggestions";

  constructor(protected override database: DatabaseService) {
    super(database);
  }

  public findByCategoryId(categoryId: string): Observable<RxSuggestion[]> {
    return this.getCollection().pipe(
      switchMap(col =>
        col.find({
          selector: {categoryId}
        }).$
      )
    );
  }
}
