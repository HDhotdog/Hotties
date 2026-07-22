/** UI-facing ingredient model, distinct from the RxDB document shape (`RxIngredient`). */
export interface Ingredient {
  id: string;
  recipeId: string;
  name: string;
  itemId?: string | null;
}
