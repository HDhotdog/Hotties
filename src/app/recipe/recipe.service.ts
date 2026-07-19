import {Injectable} from '@angular/core';
import {RecipeRepository} from './recipe.repository';
import {map, Observable} from 'rxjs';
import {IngredientService} from "../ingredients/ingredient.service";
import {Ingredient} from "../ingredients/ingredient.dto";
import {Recipe} from './models/recipe.dto';
import {toRecipe, toRxRecipe} from './models/recipe.mapper';

@Injectable({
  providedIn: 'root'
})
export class RecipeService {

  constructor(private recipeRepository: RecipeRepository, private ingredientService: IngredientService) {
  }

  public save(recipe: Recipe): Observable<Recipe> {
    return this.recipeRepository.save(toRxRecipe(recipe)).pipe(map(toRecipe));
  }

  public findAll(): Observable<Recipe[]> {
    return this.recipeRepository.findAll().pipe(map(docs => docs.map(toRecipe)));
  }

  public findById(id: string): Observable<Recipe> {
    return this.recipeRepository.findById(id).pipe(map(toRecipe));
  }

  public deleteAll(): Observable<number> {
    return this.recipeRepository.deleteAll();
  }

  public deleteById(id: string): Observable<boolean> {
    return this.recipeRepository.deleteById(id);
  }

  public getIngredients(recipeId: string): Observable<Ingredient[]> {
    return this.ingredientService.getIngredientsForRecipe(recipeId);
  }

  public saveIngredients(recipeId: string, ingredients: Ingredient[]): Observable<unknown> {
    return this.ingredientService.saveIngredientsForRecipe(recipeId, ingredients);
  }
}
