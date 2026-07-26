import { Injectable, inject } from '@angular/core';
import { Ingredient } from '../ingredients/ingredient.dto';
import { Todo } from '../todo/todo.dto';
import { CategoryRepository } from './category.repository';
import { map, Observable, of, switchMap, take } from 'rxjs';
import { ItemType } from '../todo/item-type.enum';
import { AmountUnit } from '../shared/amount-unit.enum';
import { v4 as UUIDv4 } from 'uuid';
import { TodoService } from '../todo/todo.service';
import { SettingsService } from '../database/settings/settings.service';
import { Category } from './category.dto';
import { toCategory, toRxCategory } from './category.mapper';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  private categoryRepository = inject(CategoryRepository);
  private todoService = inject(TodoService);
  private settingsService = inject(SettingsService);

  public initCategories(categories: Category[]): Observable<Category[]> {
    return this.categoryRepository
      .saveAll(categories.map(toRxCategory))
      .pipe(map((docs) => docs.map(toCategory)));
  }

  public save(category: Category): Observable<Category> {
    return this.categoryRepository
      .save(toRxCategory(category))
      .pipe(map(toCategory));
  }

  public saveAll(categories: Category[]): Observable<Category[]> {
    return this.categoryRepository
      .saveAll(categories.map(toRxCategory))
      .pipe(map((docs) => docs.map(toCategory)));
  }

  public getCategories(): Observable<Category[]> {
    return this.categoryRepository
      .findAll()
      .pipe(map((docs) => docs.map(toCategory)));
  }

  public getCategoryById(categoryId: string): Observable<Category> {
    return this.categoryRepository.findById(categoryId).pipe(map(toCategory));
  }

  public deleteAllCategories(): Observable<number> {
    return this.categoryRepository.deleteAll();
  }

  public deleteCategory(id: string): Observable<boolean> {
    return this.categoryRepository.deleteById(id);
  }

  public getSelectedCategoryId(): Observable<string | null> {
    return this.settingsService.getSelectedCategoryId();
  }

  public saveCurrentCategory(category: Category): Observable<unknown> {
    return this.settingsService.setSelectedCategoryId(category.id);
  }

  /**
   * Adds each ingredient's amount to the shopping list for `categoryId`. An
   * ingredient whose item already has a todo in that category sums into its
   * existing quantity instead of creating a duplicate row (mirrors
   * TodoComponent.addTodo's dedup behavior); everything else becomes a new todo.
   */
  public addIngredientsToCategory(
    categoryId: string,
    ingredients: Ingredient[]
  ): Observable<unknown> {
    if (ingredients.length === 0) {
      return of(void 0);
    }

    // Collapse multiple ingredients linked to the same item (e.g. two
    // recipes both calling for flour) into a single quantity to add, keyed
    // by itemId - falling back to name for legacy ingredients with no link.
    const additionsByKey = new Map<string, number>();
    const ingredientByKey = new Map<string, Ingredient>();
    for (const ingredient of ingredients) {
      const key = ingredient.itemId ?? ingredient.name;
      additionsByKey.set(key, (additionsByKey.get(key) ?? 0) + ingredient.amount);
      ingredientByKey.set(key, ingredient);
    }

    // take(1): a one-off snapshot to diff against, not a live subscription -
    // findByCategoryId() never completes, so this only reads the current state.
    return this.todoService.findByCategoryId(categoryId).pipe(
      take(1),
      switchMap((existingTodos) => {
        const toSave: Todo[] = [];
        for (const [key, amountToAdd] of additionsByKey) {
          const existing = existingTodos.find((todo) => (todo.itemId ?? todo.name) === key);
          if (existing) {
            toSave.push({ ...existing, quantity: existing.quantity + amountToAdd });
          } else {
            toSave.push(this.ingredientToTodo(categoryId, ingredientByKey.get(key)!, amountToAdd));
          }
        }
        return this.todoService.saveAll(toSave);
      })
    );
  }

  private ingredientToTodo(categoryId: string, ingredient: Ingredient, quantity: number): Todo {
    return {
      id: UUIDv4(),
      categoryId: categoryId,
      name: ingredient.name,
      done: false,
      // type/amount are placeholders - TodoService.save() overrides them from
      // the linked item, which itemId (when set) already points to.
      type: ItemType.FOOD,
      amount: AmountUnit.PIECE,
      itemId: ingredient.itemId ?? null,
      quantity,
    };
  }
}
