import {RecipeStep} from './recipe-step';

export interface RxRecipe {
  id: string;
  name: string;
  description: string;
  preparationTime: number;
  emoji?: string | null;
  steps?: RecipeStep[];
}
