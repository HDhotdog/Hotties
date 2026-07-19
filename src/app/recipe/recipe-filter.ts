import {RxLabel} from '../label/models/label';
import {RxRecipe} from './models/recipe';

export function labelsForGroup(labels: RxLabel[], groupId: string): RxLabel[] {
  return labels.filter(label => label.groupId === groupId && label.recipeId === '');
}

export function labelsForRecipe(labels: RxLabel[], recipeId: string): RxLabel[] {
  return labels.filter(label => label.recipeId === recipeId);
}

export function filterRecipes(
  recipes: RxRecipe[],
  labels: RxLabel[],
  search: string,
  setFilters: RxLabel[],
  selectedTime: number | null
): RxRecipe[] {
  const normalizedSearch = search.toLowerCase();

  return recipes.filter(recipe => {
    const matchesSearch = recipe.name.toLowerCase().includes(normalizedSearch);
    const recipeLabels = labelsForRecipe(labels, recipe.id);
    const matchesLabels = setFilters.length === 0 ||
      setFilters.every(filter => recipeLabels.some(recipeLabel => recipeLabel.name === filter.name));
    const matchesTime = !selectedTime || recipe.preparationTime <= selectedTime;

    return matchesSearch && matchesLabels && matchesTime;
  });
}
