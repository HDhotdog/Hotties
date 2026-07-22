import {RxIngredient} from './ingredient';
import {Ingredient} from './ingredient.dto';

export function toIngredient(doc: RxIngredient): Ingredient {
  return {id: doc.id, recipeId: doc.recipeId, name: doc.name, itemId: doc.itemId};
}

export function toRxIngredient(ingredient: Ingredient): RxIngredient {
  return {
    id: ingredient.id,
    recipeId: ingredient.recipeId,
    name: ingredient.name,
    itemId: ingredient.itemId ?? null,
  };
}
