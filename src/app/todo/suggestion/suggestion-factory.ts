import {RxSuggestion} from "./rxSuggestion";
import { v4 as UUIDv4 } from 'uuid';

export class SuggestionFactory {
  public static createSuggestionWithoutSuffix(suggestion: string, categoryId: string): RxSuggestion {
    return {
      id: UUIDv4(),
      categoryId: categoryId,
      suggestion: suggestion
    }
  }
}
