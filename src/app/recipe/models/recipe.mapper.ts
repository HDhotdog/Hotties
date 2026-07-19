import {RxRecipe} from './recipe';
import {Recipe} from './recipe.dto';

export function toRecipe(doc: RxRecipe): Recipe {
  return {
    id: doc.id,
    name: doc.name,
    imgSrc: doc.imgSrc,
    description: doc.description,
    preparationTime: doc.preparationTime,
    emoji: doc.emoji
  };
}

export function toRxRecipe(recipe: Recipe): RxRecipe {
  return {
    id: recipe.id,
    name: recipe.name,
    imgSrc: recipe.imgSrc,
    description: recipe.description,
    preparationTime: recipe.preparationTime,
    emoji: recipe.emoji
  };
}
