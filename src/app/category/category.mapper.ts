import {RxCategory} from './category';
import {Category} from './category.dto';

export function toCategory(doc: RxCategory): Category {
  return {id: doc.id, name: doc.name, saveSuggestions: doc.saveSuggestions};
}

export function toRxCategory(category: Category): RxCategory {
  return {id: category.id, name: category.name, saveSuggestions: category.saveSuggestions};
}
