import {inject, Injectable} from '@angular/core';
import {DatabaseService} from '../database/database';
import {FoodProduct, OpenFoodFactsService, ProductLookupError} from './open-food-facts.service';
import {isInternalBarcode} from './internal-barcode';

export const OFF_CACHE_TTL_MS = 28 * 24 * 60 * 60 * 1000;

export interface OffCacheEntry {
  barcode: string;
  status: 'found' | 'not-found';
  product: FoodProduct | null;
  fetchedAt: number;
  reviewedAt: number | null;
}

@Injectable({providedIn: 'root'})
export class OffProductCacheService {
  private readonly database = inject(DatabaseService);
  private readonly off = inject(OpenFoodFactsService);
  private readonly pending = new Map<string, Promise<FoodProduct>>();

  public async getEntry(barcode: string): Promise<OffCacheEntry | null> {
    const db = await this.database.getDb();
    const doc = await db['off_product_cache'].findOne(barcode).exec();
    return doc ? doc.toJSON() as OffCacheEntry : null;
  }

  public isFresh(entry: OffCacheEntry): boolean {
    const age = Date.now() - entry.fetchedAt;
    return age >= 0 && age < OFF_CACHE_TTL_MS;
  }

  public async lookup(barcode: string, force = false): Promise<FoodProduct> {
    if (isInternalBarcode(barcode)) {
      throw new ProductLookupError('internal-barcode', 'Internal barcodes are handled locally.');
    }
    const running = this.pending.get(barcode);
    if (running) return running;
    const request = this.lookupOne(barcode, force);
    this.pending.set(barcode, request);
    try {
      return await request;
    } finally {
      if (this.pending.get(barcode) === request) this.pending.delete(barcode);
    }
  }

  private async lookupOne(barcode: string, force: boolean): Promise<FoodProduct> {
    const cached = await this.getEntry(barcode);
    if (!force && cached && this.isFresh(cached)) {
      if (cached.status === 'not-found') {
        throw new ProductLookupError('not-found', 'This barcode is not in Open Food Facts (cached result).');
      }
      if (cached.product) return cached.product;
    }
    try {
      const product = await this.off.getProduct(barcode);
      await this.save({barcode, status: 'found', product, fetchedAt: Date.now(), reviewedAt: null});
      return product;
    } catch (error) {
      if (error instanceof ProductLookupError && error.code === 'not-found') {
        await this.save({barcode, status: 'not-found', product: null, fetchedAt: Date.now(), reviewedAt: null});
      }
      throw error;
    }
  }

  public async markReviewed(barcode: string): Promise<void> {
    const entry = await this.getEntry(barcode);
    if (entry?.status === 'found') await this.save({...entry, reviewedAt: entry.fetchedAt});
  }

  private async save(entry: OffCacheEntry): Promise<void> {
    const db = await this.database.getDb();
    await db['off_product_cache'].upsert(entry);
  }
}
