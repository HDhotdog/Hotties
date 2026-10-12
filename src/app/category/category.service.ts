import {inject, Injectable} from '@angular/core';
import {Ingredient} from '../ingredients/ingredient.dto';
import {CategoryRepository} from './category.repository';
import {from, map, Observable, switchMap} from 'rxjs';
import {ShoppingService} from '../domain/shopping.service';
import {normalizeQuantity, QuantityUnit} from '../domain/quantity';
import {SettingsService} from '../database/settings/settings.service';
import {Category} from './category.dto';
import {toCategory, toRxCategory} from './category.mapper';
import {DatabaseService} from '../database/database';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  private categoryRepository = inject(CategoryRepository);
  private shopping = inject(ShoppingService);
  private settingsService = inject(SettingsService);
  private database = inject(DatabaseService);

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

  public deleteCategory(id: string): Observable<boolean> {
    return this.categoryRepository.deleteById(id).pipe(switchMap(deleted =>
      from(this.clearMappings(id)).pipe(map(() => deleted))));
  }

  private async clearMappings(storeId: string): Promise<void> {
    const db = await this.database.getDb();
    for (const mapping of await db['internal_product_map'].find().exec()) {
      if (mapping.storeId === storeId) await mapping.remove();
    }
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
