import {RxLabel} from '../label/models/label';
import {RxRecipe} from './models/recipe';
import {filterRecipes, labelsForGroup, labelsForRecipe} from './recipe-filter';

describe('recipe-filter', () => {
  const recipes: RxRecipe[] = [
    {id: 'r1', name: 'Pasta', description: '', preparationTime: 30},
    {id: 'r2', name: 'Salad', description: '', preparationTime: 10},
  ];

  const labels: RxLabel[] = [
    {id: 'l1', groupId: 'g1', recipeId: '', name: 'Mittagessen'},
    {id: 'l2', groupId: 'g1', recipeId: 'r1', name: 'Mittagessen'},
    {id: 'l3', groupId: 'g2', recipeId: 'r2', name: 'Süß'},
  ];

  describe('labelsForGroup', () => {
    it('returns template labels for the given group', () => {
      expect(labelsForGroup(labels, 'g1')).toEqual([
        {id: 'l1', groupId: 'g1', recipeId: '', name: 'Mittagessen'},
      ]);
    });
  });

  describe('labelsForRecipe', () => {
    it('returns labels assigned to the recipe', () => {
      expect(labelsForRecipe(labels, 'r1')).toEqual([
        {id: 'l2', groupId: 'g1', recipeId: 'r1', name: 'Mittagessen'},
      ]);
    });
  });

  describe('filterRecipes', () => {
    it('filters by search text', () => {
      expect(filterRecipes(recipes, labels, 'past', [], null)).toEqual([recipes[0]]);
    });

    it('filters by assigned labels', () => {
      const filter: RxLabel = {id: 'l3', groupId: 'g2', recipeId: 'r2', name: 'Süß'};
      expect(filterRecipes(recipes, labels, '', [filter], null)).toEqual([recipes[1]]);
    });

    it('filters by preparation time', () => {
      expect(filterRecipes(recipes, labels, '', [], 15)).toEqual([recipes[1]]);
    });

    it('returns all recipes when no filters are set', () => {
      expect(filterRecipes(recipes, labels, '', [], null)).toEqual(recipes);
    });
  });
});
