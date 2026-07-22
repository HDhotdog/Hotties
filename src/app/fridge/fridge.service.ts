import { Injectable, inject } from '@angular/core';
import { FridgeItemRepository } from './fridge-item.repository';
import { map, Observable, of, switchMap } from 'rxjs';
import { FridgeItem } from './models/fridge-item.dto';
import { toFridgeItem, toRxFridgeItem } from './models/fridge-item.mapper';
import { ItemService } from '../item/item.service';

@Injectable({
  providedIn: 'root',
})
export class FridgeService {
  private fridgeItemRepository = inject(FridgeItemRepository);
  private itemService = inject(ItemService);

  public save(item: FridgeItem): Observable<FridgeItem> {
    return this.resolveItemId(item).pipe(
      switchMap((itemId) => this.fridgeItemRepository.save(toRxFridgeItem({ ...item, itemId })).pipe(map(toFridgeItem)))
    );
  }

  public findAll(): Observable<FridgeItem[]> {
    return this.fridgeItemRepository.findAll().pipe(map((docs) => docs.map(toFridgeItem)));
  }

  public findById(id: string): Observable<FridgeItem> {
    return this.fridgeItemRepository.findById(id).pipe(map(toFridgeItem));
  }

  public deleteById(id: string): Observable<boolean> {
    return this.fridgeItemRepository.deleteById(id);
  }

  /** Reuses an already-linked itemId, or finds/creates one by the fridge item's name. */
  private resolveItemId(item: FridgeItem): Observable<string> {
    if (item.itemId) {
      return of(item.itemId);
    }
    return this.itemService.findOrCreateByName(item.name).pipe(map((matched) => matched.id));
  }
}
