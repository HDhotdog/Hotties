import { Ingredient } from './ingredient.interface';
import { Label } from '../../label/models/label.interface';

export interface Recipe {
  uuid: string;
  name: string;
  imgSrc: string;
  description: string;
  prepTimeHour: number;
  prepTimeMinutes: number;
  ingredients: Ingredient[];
  lastEaten?: Date;
  labels: Label[];
  emoji?: string | null;
} 