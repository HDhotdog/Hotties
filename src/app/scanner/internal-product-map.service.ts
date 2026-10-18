import {AppError} from '../i18n/language-pack';
import {inject, Injectable} from '@angular/core';
import {DatabaseService} from '../database/database';
import {CatalogService} from '../domain/catalog.service';
import {CatalogNode} from '../domain/catalog.model';

@Injectable({providedIn: 'root'})
export class InternalProductMapService {
  private readonly database = inject(DatabaseService);
  private readonly catalog = inject(CatalogService);

  private key(storeId: string, productCode: string): string {
    return `${storeId}:${productCode}`;
  }

  public async get(storeId: string, productCode: string): Promise<CatalogNode | null> {
    const db = await this.database.getDb();
    const mapping = await db['internal_product_map'].findOne(this.key(storeId, productCode)).exec();
    if (!mapping) return null;
    try {
      const product = await this.catalog.byId(mapping.productId);
      return product.kind === 'product' && product.saleKind === 'variable' && product.variableUnit === 'g'
        ? product : null;
    } catch {
      return null;
    }
  }

  public async save(storeId: string, productCode: string, productId: string): Promise<void> {
    if (!/^\d{5}$/.test(productCode)) throw new AppError('ui.internalProductIdMustHaveFiveDigits', "Internal product ID must have five digits.");
    const product = await this.catalog.byId(productId);
    if (product.kind !== 'product' || product.saleKind !== 'variable' || product.variableUnit !== 'g') {
      throw new AppError('ui.chooseAProductSoldByTheGram', "Choose a product sold by the gram.");
    }
    const db = await this.database.getDb();
    if (!await db['categories'].findOne(storeId).exec()) throw new AppError('ui.chooseAValidShoppingList', "Choose a valid shopping list.");
    await db['internal_product_map'].upsert({
      id: this.key(storeId, productCode), storeId, productCode, productId
    });
  }
}
