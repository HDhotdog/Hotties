/** UI-facing recipe model, distinct from the RxDB document shape (`RxRecipe`). */
export interface Recipe {
  id: string;
  name: string;
  description: string;
  preparationTime: number;
}
