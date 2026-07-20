import { Injectable, inject } from '@angular/core';
import { RxCategory } from './category';
import { DatabaseService } from '../database/database';
import { AbstractRepository } from '../database/abstract-repository';

@Injectable({
  providedIn: 'root',
})
export class CategoryRepository extends AbstractRepository<RxCategory> {
  protected override database: DatabaseService;

  protected override collectionName: string = 'categories';

  constructor() {
    const database = inject(DatabaseService);

    super(database);

    this.database = database;
  }
}
