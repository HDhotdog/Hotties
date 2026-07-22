import { Injectable, inject } from '@angular/core';
import { FridgeItemRepository } from './fridge-item.repository';
import { map, Observable } from 'rxjs';
import { FridgeItem } from './models/fridge-item.dto';
import { toFridgeItem, toRxFridgeItem } from './models/fridge-item.mapper';

@Injectable({
  providedIn: 'root',
})
export class FridgeService {
  private fridgeItemRepository = inject(FridgeItemRepository);

  public save(item: FridgeItem): Observable<FridgeItem> {
    return this.fridgeItemRepository.save(toRxFridgeItem(item)).pipe(map(toFridgeItem));
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
}
