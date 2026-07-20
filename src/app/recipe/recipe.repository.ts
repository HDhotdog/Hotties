import { Injectable, inject } from '@angular/core';
import { RxRecipe } from './models/recipe';
import { AbstractRepository } from '../database/abstract-repository';
import { DatabaseService } from '../database/database';

@Injectable({
  providedIn: 'root',
})
export class RecipeRepository extends AbstractRepository<RxRecipe> {
  protected override database: DatabaseService;

  protected override collectionName: string = 'recipes';

  constructor() {
    const database = inject(DatabaseService);

    super(database);

    this.database = database;
  }
}
