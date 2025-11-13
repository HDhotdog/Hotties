import {Injectable} from '@angular/core';
import {Category} from './category';
import {Ingredient} from '../recipe/models/ingredient.interface';
import {Recipe} from '../recipe/models/recipe.interface';
import {ImportanceLevel, ToDo} from '../todo/todo';
import { CategoryRepository } from './category.repository';
import { forkJoin, map, Observable } from 'rxjs';
import Optional from '../util/optional';
@Injectable({
  providedIn: 'root'
})
export class CategoryService {

  constructor(private categoryRepository: CategoryRepository) {
  }

  public initCategories(categories: Category[]): Observable<void> {
    const saveAll = this.categoryRepository.saveAll(categories);
    const saveLastCategory = this.categoryRepository.saveLastCategory(0);
    return forkJoin([saveAll, saveLastCategory]).pipe(
      map(() => {
        return;
      })
    );
  }

  public save(category: Category): Observable<void> {
    return this.categoryRepository.save(category);
  }

  public saveAll(categories: Category[]): Observable<void> {
    return this.categoryRepository.saveAll(categories);
  }

  public async saveLastCategory(index: number) {
    this.categoryRepository.saveLastCategory(index);
  }

  public getCategories(): Observable<Category[]> {
    return this.categoryRepository.findAll();
  }

  public getCategoryById(id: string): Observable<Optional<Category>> {
    return this.categoryRepository.findCategoryById(id);
  }

  public getLastCategory(): Observable<number> {
    return this.categoryRepository.getLastCategory();
  }

  public deleteAllCategories(): Observable<void> {
    return this.categoryRepository.deleteAllCategories();
  }

  public deleteCategory(id: string): void {
    this.categoryRepository.deleteCategory(id);
  }

  public addIngredientsToCategory(categoryId: string, recipe: Recipe) {
    this.categoryRepository.findCategoryById(categoryId).subscribe((category) => {
      category.ifPresentOrElse((cat) => {
        const toDos: ToDo[] = recipe.ingredients.map((item) => this.ingredientToTodo(item))
        cat.elements.push(...toDos);
        this.save(cat);
      }, () => {
        throw new Error('Category with id ' + categoryId + ' not found');
      });
    });
  }

  private ingredientToTodo(ingredient: Ingredient): ToDo {
    return {
      task: ingredient.name,
      done: false,
      importance: ImportanceLevel.NORMAL
    }
  }
}
