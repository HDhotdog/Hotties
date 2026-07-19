import {Injectable} from "@angular/core";
import {IngredientRepository} from "./ingredient.repository";
import {map, Observable, switchMap} from "rxjs";
import {Ingredient} from "./ingredient.dto";
import {toIngredient, toRxIngredient} from "./ingredient.mapper";

@Injectable({
  providedIn: 'root'
})
export class IngredientService {
  constructor(private ingredientRepository: IngredientRepository) {
  }

  public getIngredientsForRecipe(recipeId: string): Observable<Ingredient[]> {
    return this.ingredientRepository.findByRecipeId(recipeId).pipe(map(docs => docs.map(toIngredient)));
  }

  /** Replaces all ingredients for a recipe with the given list. */
  public saveIngredientsForRecipe(recipeId: string, ingredients: Ingredient[]): Observable<unknown> {
    return this.ingredientRepository.deleteByRecipeId(recipeId).pipe(
      switchMap(() => this.ingredientRepository.saveAll(ingredients.map(toRxIngredient)))
    );
  }
}
