import {RxSuggestion} from './rxSuggestion';
import {Suggestion} from './suggestion.dto';

export function toSuggestion(doc: RxSuggestion): Suggestion {
  return {id: doc.id, categoryId: doc.categoryId, suggestion: doc.suggestion, suffix: doc.suffix};
}

export function toRxSuggestion(suggestion: Suggestion): RxSuggestion {
  return {id: suggestion.id, categoryId: suggestion.categoryId, suggestion: suggestion.suggestion, suffix: suggestion.suffix};
}
