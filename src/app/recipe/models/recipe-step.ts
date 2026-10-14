/** Ordered recipe instructions, linked to recipe-specific ingredients. */
export interface RecipeStep {
  id: string;
  instructions: string;
  ingredientIds: string[];
}

export function copyRecipeSteps(steps: readonly RecipeStep[] = []): RecipeStep[] {
  return steps.map(step => ({...step, ingredientIds: [...step.ingredientIds]}));
}
