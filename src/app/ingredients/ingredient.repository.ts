import {AbstractRepository} from "../database/abstract-repository";
import {RxIngredient} from "./ingredient";
import {DatabaseService} from "../database/database";
import {Observable, switchMap} from "rxjs";
import {Injectable} from "@angular/core";

@Injectable({
  providedIn: 'root'
})
export class IngredientRepository extends AbstractRepository<RxIngredient> {
  protected override collectionName: string = 'ingredients';

  constructor(protected override database: DatabaseService) {
    super(database);
  }

  public findByRecipeId(recipeId: string): Observable<RxIngredient[]> {
    return this.getCollection().pipe(
      switchMap(col =>
        col.find({
          selector: {recipeId}
        }).$
      )
    );
  }
}

