import {Injectable} from "@angular/core";
import {IngredientRepository} from "./ingredient.repository";
import {Observable, switchMap} from "rxjs";
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

  /** Replaces all ingredients for a recipe with the given list. */
  public saveIngredientsForRecipe(recipeId: string, ingredients: RxIngredient[]): Observable<unknown> {
    return this.ingredientRepository.deleteByRecipeId(recipeId).pipe(
      switchMap(() => this.ingredientRepository.saveAll(ingredients))
    );
  }
}
