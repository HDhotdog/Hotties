import {toRecipe, toRxRecipe} from './recipe.mapper';

describe('recipe mapper', () => {
  const legacy = {id: 'recipe', name: 'Soup', description: 'Notes', preparationTime: 10};

  it('normalizes missing steps for older callers in both directions', () => {
    expect(toRecipe(legacy).steps).toEqual([]);
    expect(toRxRecipe(legacy).steps).toEqual([]);
  });

  it('copies nested step references so a caller cannot mutate the source snapshot', () => {
    const recipe = {...legacy, steps: [{id: 'season', instructions: 'Season.', ingredientIds: ['salt']}]};
    const dto = toRecipe(recipe);
    dto.steps![0].ingredientIds.push('onion');
    dto.steps![0].instructions = 'New instructions';
    expect(recipe.steps).toEqual([{id: 'season', instructions: 'Season.', ingredientIds: ['salt']}]);
    const stored = toRxRecipe(dto);
    dto.steps![0].ingredientIds.pop();
    expect(stored.steps![0].ingredientIds).toEqual(['salt', 'onion']);
  });
});
