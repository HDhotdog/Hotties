import {inject, Injectable} from '@angular/core';
import {from, map, Observable, switchMap} from 'rxjs';
import {DatabaseService} from '../database/database';
import {CatalogService} from '../domain/catalog.service';
import {normalizeQuantity, QuantityUnit} from '../domain/quantity';
import {AmountUnit} from '../shared/amount-unit.enum';
import {Ingredient} from './ingredient.dto';

@Injectable({providedIn: 'root'})
export class IngredientService {
  private readonly database = inject(DatabaseService);
  private readonly catalog = inject(CatalogService);

  public getIngredientsForRecipe(recipeId: string): Observable<Ingredient[]> {
    return from(this.database.getDb()).pipe(switchMap(db => db['recipe_ingredients'].find().$),
      map((docs: any[]) => docs.map(doc => doc.toJSON() as Ingredient).filter(item => item.recipeId === recipeId)));
  }

  public saveIngredientsForRecipe(recipeId: string, ingredients: Ingredient[]): Observable<void> {
    return from(this.replace(recipeId, ingredients));
  }

  public deleteForRecipe(recipeId: string): Observable<void> {
    return from(this.deleteWhere(recipeId));
  }

  public deleteAll(): Observable<void> {
    return from(this.deleteWhere());
  }

  private async deleteWhere(recipeId?: string): Promise<void> {
    const db = await this.database.getDb();
    const docs = recipeId ? await db['recipe_ingredients'].find({selector: {recipeId}}).exec()
      : await db['recipe_ingredients'].find().exec();
    await Promise.all(docs.map((doc: any) => doc.remove()));
  }

  private async replace(recipeId: string, ingredients: Ingredient[]): Promise<void> {
    const nodes = await this.catalog.all();
    const normalized = ingredients.map(ingredient => {
      const targetNodeId = ingredient.targetNodeId;
      if (!targetNodeId || !nodes.some(node => node.id === targetNodeId) ||
        !this.catalog.matches('root-food', targetNodeId, nodes)) {
        throw new Error('Recipe ingredients must reference a food category or product.');
      }
      const unit = this.legacyUnit(ingredient.unit);
      const scalar = ingredient.unit === AmountUnit.HUNDRED_GRAM || ingredient.unit === AmountUnit.HUNDRED_MILLILITER ? 100 : 1;
      const amount = normalizeQuantity({amount: Number(ingredient.amount) * scalar, unit});
      return {
        id: ingredient.id,
        recipeId,
        targetNodeId,
        name: ingredient.name,
        amount: amount.amount,
        unit: amount.unit
      };
    });
    const db = await this.database.getDb();
    const old = await db['recipe_ingredients'].find({selector: {recipeId}}).exec();
    if (normalized.length) await db['recipe_ingredients'].bulkUpsert(normalized);
    const incomingIds = new Set(normalized.map(item => item.id));
    await Promise.all(old.filter((doc: any) => !incomingIds.has(doc.id)).map((doc: any) => doc.remove()));
  }

  private legacyUnit(unit: Ingredient['unit']): QuantityUnit {
    switch (unit) {
      case AmountUnit.PIECE:
        return 'piece';
      case AmountUnit.PACKAGE:
        return 'package';
      case AmountUnit.BUNCH:
        return 'bunch';
      case AmountUnit.PINCH:
        return 'pinch';
      case AmountUnit.HUNDRED_GRAM:
        return 'g';
      case AmountUnit.HUNDRED_MILLILITER:
        return 'ml';
      default:
        return unit as QuantityUnit;
    }
  }
}
