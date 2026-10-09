import { Injectable, inject } from '@angular/core';
import { RecipeRepository } from './recipe.repository';
import { map, Observable, of, switchMap } from 'rxjs';
import { IngredientService } from '../ingredients/ingredient.service';
import { Ingredient } from '../ingredients/ingredient.dto';
import { Recipe } from './models/recipe.dto';
import { toRecipe, toRxRecipe } from './models/recipe.mapper';

@Injectable({
  providedIn: 'root',
})
export class RecipeService {
  private recipeRepository = inject(RecipeRepository);
  private ingredientService = inject(IngredientService);

  public save(recipe: Recipe): Observable<Recipe> {
    return this.recipeRepository.save(toRxRecipe(recipe)).pipe(map(toRecipe));
  }

  public findAll(): Observable<Recipe[]> {
    return this.recipeRepository
      .findAll()
      .pipe(map((docs) => docs.map(toRecipe)));
  }

  public findById(id: string): Observable<Recipe> {
    return this.recipeRepository.findById(id).pipe(map(toRecipe));
  }

  public deleteAll(): Observable<number> {
    return this.recipeRepository.deleteAll().pipe(switchMap(count =>
      this.ingredientService.deleteAll().pipe(map(() => count))));
  }

  public deleteById(id: string): Observable<boolean> {
    return this.recipeRepository.deleteById(id).pipe(switchMap(deleted =>
      deleted ? this.ingredientService.deleteForRecipe(id).pipe(map(() => true)) : of(false)));
  }

  public getImageUrl(id: string): Observable<string | null> {
    return this.recipeRepository
      .getImage(id)
      .pipe(map((blob) => (blob ? URL.createObjectURL(blob) : null)));
  }

  public saveImage(id: string, blob: Blob): Observable<void> {
    return this.recipeRepository.saveImage(id, blob);
  }

  public deleteImage(id: string): Observable<void> {
    return this.recipeRepository.deleteImage(id);
  }

  public getIngredients(recipeId: string): Observable<Ingredient[]> {
    return this.ingredientService.getIngredientsForRecipe(recipeId);
  }

  public saveIngredients(
    recipeId: string,
    ingredients: Ingredient[]
  ): Observable<unknown> {
    return this.ingredientService.saveIngredientsForRecipe(
      recipeId,
      ingredients
    );
  }
}
