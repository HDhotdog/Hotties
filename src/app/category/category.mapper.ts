import {RxCategory} from './category';
import {Category} from './category.dto';

export function toCategory(doc: RxCategory): Category {
  return {id: doc.id, name: doc.name, saveSuggestions: doc.saveSuggestions, sortOrder: doc.sortOrder ?? 0};
}

export function toRxCategory(category: Category): RxCategory {
  return {id: category.id, name: category.name, saveSuggestions: category.saveSuggestions, sortOrder: category.sortOrder ?? 0};
}
