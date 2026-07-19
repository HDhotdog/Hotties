export interface RxRecipe {
  id: string;
  name: string;
  imgSrc?: string;
  description: string;
  preparationTime: number;
  emoji?: string | null;
}
