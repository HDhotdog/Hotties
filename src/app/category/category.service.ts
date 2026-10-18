import {AppError} from '../i18n/language-pack';
import {inject, Injectable} from '@angular/core';
import {Ingredient} from '../ingredients/ingredient.dto';
import {CategoryRepository} from './category.repository';
import {defer, firstValueFrom, from, map, Observable} from 'rxjs';
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
      .pipe(map((docs) => docs.map(toCategory).sort((a, b) =>
        (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id.localeCompare(b.id))));
  }

  public getCategoryById(categoryId: string): Observable<Category> {
    return this.categoryRepository.findById(categoryId).pipe(map(toCategory));
  }

  private deletionQueue: Promise<unknown> = Promise.resolve();

  public async getItemCount(id: string): Promise<number> {
    return (await this.shopping.all(id)).length;
  }

  /** Serialize deletions so concurrent requests cannot remove the last list. */
  public deleteCategory(id: string, confirmedItemCount = 0): Observable<boolean> {
    return defer(() => {
      const deletion = this.deletionQueue.then(() => this.deleteList(id, confirmedItemCount));
      this.deletionQueue = deletion.catch(() => undefined);
      return from(deletion);
    });
  }

  private async deleteList(id: string, confirmedItemCount: number): Promise<boolean> {
    const lists = await firstValueFrom(this.getCategories());
    if (!lists.some(list => list.id === id)) return false;
    if (lists.length <= 1) throw new AppError('ui.keepAtLeastOneShoppingList', "Keep at least one shopping list.");
    if (await this.getItemCount(id) !== confirmedItemCount) {
      throw new AppError('ui.theItemsInThisListChangedPleaseReviewTheDeletionAgain', "The items in this list changed. Please review the deletion again.");
    }
    // Remove contents first; if cleanup fails, the list remains available for retry.
    await this.shopping.clearList(id);
    const db = await this.database.getDb();
    await db['internal_product_map'].find({selector: {storeId: id}}).remove();
    await db['suggestions'].find({selector: {categoryId: id}}).remove();
    if (await firstValueFrom(this.getSelectedCategoryId()) === id) {
      await firstValueFrom(this.settingsService.setSelectedCategoryId(lists.find(list => list.id !== id)!.id));
    }
    return firstValueFrom(this.categoryRepository.deleteById(id));
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
      if (!ingredient.targetNodeId) return Promise.reject(new AppError('ui.ingredientHasNoCatalogTarget', "Ingredient has no catalog target."));
      return this.shopping.addProduct(categoryId, ingredient.targetNodeId, {
        kind: 'quantity',
        quantity: normalizeQuantity({amount: ingredient.amount, unit: ingredient.unit as QuantityUnit})
      });
    })));
  }
}
