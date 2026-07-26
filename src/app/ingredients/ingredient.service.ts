import { Injectable, inject } from '@angular/core';
import { IngredientRepository } from './ingredient.repository';
import { forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { Ingredient } from './ingredient.dto';
import { toIngredient, toRxIngredient } from './ingredient.mapper';
import { ItemService } from '../item/item.service';

@Injectable({
  providedIn: 'root',
})
export class IngredientService {
  private ingredientRepository = inject(IngredientRepository);
  private itemService = inject(ItemService);

  public getIngredientsForRecipe(recipeId: string): Observable<Ingredient[]> {
    return this.ingredientRepository
      .findByRecipeId(recipeId)
      .pipe(map((docs) => docs.map(toIngredient)));
  }

  /** Replaces all ingredients for a recipe with the given list. */
  public saveIngredientsForRecipe(
    recipeId: string,
    ingredients: Ingredient[]
  ): Observable<unknown> {
    const linkedIngredients$ = ingredients.length === 0
      ? of([])
      : forkJoin(
          ingredients.map((ingredient) =>
            this.resolveItemId(ingredient).pipe(map((itemId) => ({ ...ingredient, itemId })))
          )
        );

    return linkedIngredients$.pipe(
      switchMap((linkedIngredients) =>
        this.ingredientRepository
          .deleteByRecipeId(recipeId)
          .pipe(
            switchMap(() =>
              this.ingredientRepository.saveAll(linkedIngredients.map(toRxIngredient))
            )
          )
      )
    );
  }

  /** Reuses an already-linked itemId, or finds/creates one by the ingredient's name. */
  private resolveItemId(ingredient: Ingredient): Observable<string> {
    if (ingredient.itemId) {
      return of(ingredient.itemId);
    }
    return this.itemService.findOrCreateByName(ingredient.name).pipe(map((item) => item.id));
  }
}
