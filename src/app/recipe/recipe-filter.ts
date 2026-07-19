import {Label} from '../label/models/label.dto';
import {Recipe} from './models/recipe.dto';

export function labelsForGroup(labels: Label[], groupId: string): Label[] {
  return labels.filter(label => label.groupId === groupId && label.recipeId === '');
}

export function labelsForRecipe(labels: Label[], recipeId: string): Label[] {
  return labels.filter(label => label.recipeId === recipeId);
}

export function filterRecipes(
  recipes: Recipe[],
  labels: Label[],
  search: string,
  setFilters: Label[],
  selectedTime: number | null
): Recipe[] {
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
