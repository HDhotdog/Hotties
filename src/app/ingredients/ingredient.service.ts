import {Injectable} from "@angular/core";
import {IngredientRepository} from "./ingredient.repository";
import {Observable} from "rxjs";
import {RxIngredient} from "./ingredient";

@Injectable({
  providedIn: 'root'
})
export class IngredientService {
  constructor(private ingredientRepository: IngredientRepository) {
  }

  public getIngredientsForRecipe(recipeId: string): Observable<RxIngredient[]> {
    return this.ingredientRepository.findByRecipeId(recipeId);
  }
}
