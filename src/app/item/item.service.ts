import { Injectable, inject } from '@angular/core';
import { ItemRepository } from './item.repository';
import { forkJoin, map, Observable, of, switchMap, throwError } from 'rxjs';
import { Item } from './models/item.dto';
import { toItem, toRxItem } from './models/item.mapper';
import { IngredientRepository } from '../ingredients/ingredient.repository';
import { TodoRepository } from '../todo/todo.repository';
import { FridgeItemRepository } from '../fridge/fridge-item.repository';
import { AmountUnit } from '../shared/amount-unit.enum';
import { ItemType } from '../todo/item-type.enum';
import { v4 as uuidv4 } from 'uuid';
import { FoodProduct } from '../scanner/open-food-facts.service';

@Injectable({
  providedIn: 'root',
})
export class ItemService {
  private itemRepository = inject(ItemRepository);
  private ingredientRepository = inject(IngredientRepository);
  private todoRepository = inject(TodoRepository);
  private fridgeItemRepository = inject(FridgeItemRepository);

  public save(item: Item): Observable<Item> {
    return this.itemRepository.save(toRxItem(item)).pipe(map(toItem));
  }

  public findAll(): Observable<Item[]> {
    return this.itemRepository.findAll().pipe(map((docs) => docs.map(toItem)));
  }

  public findById(id: string): Observable<Item> {
    return this.itemRepository.findById(id).pipe(map(toItem));
  }

  /** A scanned product is cached in the shared items collection by barcode. */
  public findByBarcode(barcode: string): Observable<Item | null> {
    return this.itemRepository.findAllOnce().pipe(
      map((docs) => docs.find((doc) => doc.barcode === barcode)),
      map((doc) => doc ? toItem(doc) : null)
    );
  }

  public saveScannedProduct(product: FoodProduct): Observable<Item> {
    return this.findByBarcode(product.barcode).pipe(
      switchMap((existing) => existing ? of(existing) : this.save({
        id: uuidv4(),
        name: product.name,
        price: null,
        unit: AmountUnit.PACKAGE,
        amount: 1,
        type: ItemType.FOOD,
        barcode: product.barcode,
        brand: product.brand,
        packageQuantity: product.packageQuantity,
      }))
    );
  }

  /**
   * Finds an item matching `name` (case/whitespace-insensitive) or creates one,
   * so todos/fridge_items/ingredients can stay linked without requiring the user
   * to pick from an autocomplete yet. See docs/ITEM-ENTITY-PLAN.md.
   *
   * `defaultUnit` only applies when a brand-new item is created (e.g. todos
   * default new items to `Packung` since they're bought as whole packages,
   * while fridge/ingredient callers default to `Stück`).
   */
  public findOrCreateByName(name: string, defaultUnit: AmountUnit = AmountUnit.PIECE): Observable<Item> {
    return this.itemRepository.findAllOnce().pipe(
      map((docs) => docs.map(toItem)),
      switchMap((items) => {
        const normalized = name.trim().toLowerCase();
        const match = items.find((item) => item.name.trim().toLowerCase() === normalized);
        if (match) {
          return of(match);
        }
        return this.save({ id: uuidv4(), name: name.trim(), price: null, unit: defaultUnit, amount: 1, type: ItemType.FOOD });
      })
    );
  }

  /** True if no todo, fridge item, or recipe ingredient currently references this item. */
  public isDeletable(id: string): Observable<boolean> {
    return forkJoin([
      this.todoRepository.findByItemId(id),
      this.fridgeItemRepository.findByItemId(id),
      this.ingredientRepository.findByItemId(id),
    ]).pipe(map(([todos, fridgeItems, ingredients]) => todos.length === 0 && fridgeItems.length === 0 && ingredients.length === 0));
  }

  /** Refuses to delete an item still used by a todo, fridge item, or recipe ingredient. */
  public deleteById(id: string): Observable<boolean> {
    return this.isDeletable(id).pipe(
      switchMap((deletable) => {
        if (!deletable) {
          return throwError(() => new Error('Item is still in use and cannot be deleted.'));
        }
        return this.itemRepository.deleteById(id);
      })
    );
  }
}
