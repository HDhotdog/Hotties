import { Injectable, inject } from '@angular/core';
import { RxFridgeItem } from './rxFridgeItem';
import { DatabaseService } from '../database/database';
import { AbstractRepository } from '../database/abstract-repository';

@Injectable({
  providedIn: 'root',
})
export class FridgeItemRepository extends AbstractRepository<RxFridgeItem> {
  protected override database: DatabaseService;

  protected override collectionName: string = 'fridge_items';

  constructor() {
    const database = inject(DatabaseService);

    super(database);

    this.database = database;
  }
}
