import {copyRecipeSteps} from './recipe-step';
import {RxRecipe} from './recipe';
import {Recipe} from './recipe.dto';

export function toRecipe(doc: RxRecipe): Recipe {
  return {
    id: doc.id,
    name: doc.name,
    description: doc.description,
    preparationTime: doc.preparationTime,
    emoji: doc.emoji,
    steps: copyRecipeSteps(doc.steps)
  };
}

export function toRxRecipe(recipe: Recipe): RxRecipe {
  return {
    id: recipe.id,
    name: recipe.name,
    description: recipe.description,
    preparationTime: recipe.preparationTime,
    emoji: recipe.emoji,
    steps: copyRecipeSteps(recipe.steps)
  };
}
