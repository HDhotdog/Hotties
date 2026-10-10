import {Suggestion} from "./suggestion.dto";
import {v4 as UUIDv4} from 'uuid';

export class SuggestionFactory {
  public static createSuggestionWithoutSuffix(suggestion: string, categoryId: string): Suggestion {
    return {
      id: UUIDv4(),
      categoryId: categoryId,
      suggestion: suggestion
    }
  }
}
