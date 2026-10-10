import {inject, Injectable} from '@angular/core';
import {Ingredient} from '../ingredients/ingredient.dto';
import {CategoryRepository} from './category.repository';
import {from, map, Observable} from 'rxjs';
import {ShoppingService} from '../domain/shopping.service';
import {normalizeQuantity, QuantityUnit} from '../domain/quantity';
import {SettingsService} from '../database/settings/settings.service';
import {Category} from './category.dto';
import {toCategory, toRxCategory} from './category.mapper';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  private categoryRepository = inject(CategoryRepository);
  private shopping = inject(ShoppingService);
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

  /** Preserve each recipe requirement's measured amount when exporting. */
  public addIngredientsToCategory(
    categoryId: string,
    ingredients: Ingredient[]
  ): Observable<unknown> {
    return from(Promise.all(ingredients.map(ingredient => {
      if (!ingredient.targetNodeId) return Promise.reject(new Error('Ingredient has no catalog target.'));
      return this.shopping.addProduct(categoryId, ingredient.targetNodeId, {
        kind: 'quantity',
        quantity: normalizeQuantity({amount: ingredient.amount, unit: ingredient.unit as QuantityUnit})
      });
    })));
  }
}
