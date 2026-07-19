import {Injectable} from '@angular/core';
import {RxRecipe} from './models/recipe';
import {RecipeRepository} from './recipe.repository';
import {Observable} from 'rxjs';
import {IngredientService} from "../ingredients/ingredient.service";
import {RxIngredient} from "../ingredients/ingredient";

@Injectable({
  providedIn: 'root'
})
export class RecipeService {

  constructor(private recipeRepository: RecipeRepository, private ingredientService: IngredientService) {
  }

  public save(recipe: RxRecipe): Observable<RxRecipe> {
    return this.recipeRepository.save(recipe);
  }

  public findAll(): Observable<RxRecipe[]> {
    return this.recipeRepository.findAll();
  }

  public findById(id: string): Observable<RxRecipe> {
    return this.recipeRepository.findById(id);
  }

  public deleteAll(): Observable<number> {
    return this.recipeRepository.deleteAll();
  }

  public deleteById(id: string): Observable<boolean> {
    return this.recipeRepository.deleteById(id);
  }

  public getIngredients(recipeId: string): Observable<RxIngredient[]> {
    return this.ingredientService.getIngredientsForRecipe(recipeId);
  }

  public saveIngredients(recipeId: string, ingredients: RxIngredient[]): Observable<unknown> {
    return this.ingredientService.saveIngredientsForRecipe(recipeId, ingredients);
  }
}
