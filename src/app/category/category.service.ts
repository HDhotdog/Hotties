import { Injectable, inject } from '@angular/core';
import { Ingredient } from '../ingredients/ingredient.dto';
import { Todo } from '../todo/todo.dto';
import { CategoryRepository } from './category.repository';
import { map, Observable } from 'rxjs';
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

  public addIngredientsToCategory(
    categoryId: string,
    ingredients: Ingredient[]
  ): Observable<unknown> {
    const toDos: Todo[] = ingredients.map((item) =>
      this.ingredientToTodo(categoryId, item)
    );
    return this.todoService.saveAll(toDos);
  }

  private ingredientToTodo(categoryId: string, ingredient: Ingredient): Todo {
    return {
      id: UUIDv4(),
      categoryId: categoryId,
      name: ingredient.name,
      done: false,
      type: ItemType.FOOD,
      amount: AmountUnit.PIECE,
    };
  }
}
