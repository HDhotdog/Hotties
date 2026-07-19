import {Injectable} from "@angular/core";
import {RxRecipe} from "./models/recipe";
import {AbstractRepository} from "../database/abstract-repository";
import {DatabaseService} from "../database/database";

@Injectable({
  providedIn: 'root'
})
export class RecipeRepository extends AbstractRepository<RxRecipe>{

  protected override collectionName: string = "recipes";

  constructor(protected override database: DatabaseService) {
    super(database);
  }
}
