import {Injectable} from '@angular/core';
import {RxCategory} from './category';
import {RxIngredient} from '../ingredients/ingredient';
import {RxToDo} from '../todo/rxToDo';
import {CategoryRepository} from './category.repository';
import {Observable} from 'rxjs';
import {ImportanceLevel} from "../todo/importance-level.enum";
import {v4 as UUIDv4} from 'uuid';
import {TodoService} from "../todo/todo.service";

@Injectable({
  providedIn: 'root'
})
export class CategoryService {

  constructor(private categoryRepository: CategoryRepository, private todoService: TodoService) {
  }

  public initCategories(categories: RxCategory[]): Observable<RxCategory[]> {
    return this.categoryRepository.saveAll(categories);
  }

  public save(category: RxCategory): Observable<RxCategory> {
    return this.categoryRepository.save(category);
  }

  public saveAll(categories: RxCategory[]): Observable<RxCategory[]> {
    return this.categoryRepository.saveAll(categories);
  }

  // public async saveLastCategory(index: number) {
  //   this.categoryRepository.saveLastCategory(index);
  // }

  public getCategories(): Observable<RxCategory[]> {
    return this.categoryRepository.findAll();
  }

  public getCategoryById(categoryId: string): Observable<RxCategory> {
    return this.categoryRepository.findById(categoryId);
  }

  // public getCategoryById(id: string): Observable<Optional<RxCategory>> {
  //   return this.categoryRepository.findCategoryById(id);
  // }
  //
  // public getLastCategory(): Observable<number> {
  //   return this.categoryRepository.getLastCategory();
  // }
  //
  public deleteAllCategories(): Observable<number> {
    return this.categoryRepository.deleteAll();
  }

  //
  public deleteCategory(id: string): Observable<boolean> {
    return this.categoryRepository.deleteById(id);
  }

  public saveCurrentCategory(category: RxCategory): void {
    localStorage.setItem("selectedCategoryId", category.id);
  }

  public addIngredientsToCategory(categoryId: string, ingredients: RxIngredient[]): Observable<unknown> {
    const toDos: RxToDo[] = ingredients.map((item) => this.ingredientToTodo(categoryId, item));
    return this.todoService.saveAll(toDos);
  }

  private ingredientToTodo(categoryId: string, ingredient: RxIngredient): RxToDo {
    return {
      id: UUIDv4(),
      categoryId: categoryId,
      name: ingredient.name,
      done: false,
      importance: ImportanceLevel.NORMAL
    }
  }
}
