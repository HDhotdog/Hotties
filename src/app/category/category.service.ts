import {Injectable} from '@angular/core';
import {RxCategory} from './category';
import {RxIngredient} from '../ingredients/ingredient';
import {RxRecipe} from '../recipe/models/recipe';
import {RxToDo} from '../todo/rxToDo';
import {CategoryRepository} from './category.repository';
import {Observable, of} from 'rxjs';
import {ImportanceLevel} from "../todo/importance-level.enum";
import {v4 as UUIDv4} from 'uuid';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {

  constructor(private categoryRepository: CategoryRepository) {
  }

  public initCategories(categories: RxCategory[]): Observable<void> {
    // const saveAll = this.categoryRepository.saveAll(categories);
    // const saveLastCategory = this.categoryRepository.saveLastCategory(0);
    // return forkJoin([saveAll, saveLastCategory]).pipe(
    //   map(() => {
    //     return;
    //   })
    // );
    return of()
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

  public addIngredientsToCategory(categoryId: string, recipe: RxRecipe): void {
    // this.categoryRepository.findCategoryById(categoryId).subscribe((category) => {
    //   category.ifPresentOrElse((cat) => {
    //     const toDos: RxToDo[] = recipe.ingredients.map((item) => this.ingredientToTodo(categoryId, item))
    //     // cat.elements.push(...toDos);
    //     this.save(cat);
    //   }, () => {
    //     throw new Error('Category with id ' + categoryId + ' not found');
    //   });
    // });
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
