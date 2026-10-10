export function createCategorySuggestionWorker(): Worker {
  return new Worker(new URL('./category-suggestion.worker', import.meta.url), {type: 'module'});
}
