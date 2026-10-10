import {inject, Injectable} from '@angular/core';
import {from, map, Observable, switchMap} from 'rxjs';
import {v4 as uuidv4} from 'uuid';
import {DatabaseService} from '../database/database';
import {CatalogService} from './catalog.service';
import {ShoppingService} from './shopping.service';
import {CatalogNode} from './catalog.model';
import {ScanAllocation, ShoppingEntry, StockLot} from './shopping.model';
import {BaseQuantity, BaseUnit} from './quantity';

export type Availability = { status: 'enough' | 'insufficient' | 'unknown'; available: number; unit: BaseUnit };

@Injectable({providedIn: 'root'})
export class StockService {
  private readonly database = inject(DatabaseService);
  private readonly catalog = inject(CatalogService);
  private readonly shopping = inject(ShoppingService);
  private receiveQueue: Promise<void> = Promise.resolve();

  public async all(): Promise<StockLot[]> {
    const db = await this.database.getDb();
    return (await db['stock_lots'].find().exec()).map((doc: any) => doc.toJSON() as StockLot);
  }

  public observe(): Observable<StockLot[]> {
    return from(this.database.getDb()).pipe(switchMap(db => db['stock_lots'].find().$),
      map((docs: any[]) => docs.map(doc => doc.toJSON() as StockLot)));
  }

  public async save(lot: StockLot): Promise<void> {
    const product = await this.catalog.byId(lot.productId);
    if (product.kind !== 'product') throw new Error('Stock must reference a product.');
    if (!(lot.acquiredAmount > 0) || lot.remainingAmount < 0 || lot.remainingAmount > lot.acquiredAmount) {
      throw new Error('Remaining stock must be within the acquired quantity.');
    }
    const db = await this.database.getDb();
    const previous = await db['stock_lots'].findOne(lot.id).exec();
    // Existing lots retain their acquired quantity when a product's current package changes.
    const sameAcquisition = previous && previous.productId === lot.productId &&
      previous.acquiredAmount === lot.acquiredAmount && previous.acquiredUnit === lot.acquiredUnit &&
      previous.acquiredPackages === lot.acquiredPackages;
    if (!sameAcquisition && product.saleKind === 'fixed' && (lot.acquiredUnit !== product.packageUnit ||
      lot.acquiredAmount > lot.acquiredPackages * (product.packageAmount ?? 0))) {
      throw new Error('Stock exceeds the acquired packages.');
    }
    if (!sameAcquisition && product.saleKind === 'variable' && lot.acquiredUnit !== product.variableUnit) {
      throw new Error('Stock unit does not match this product.');
    }
    if (!sameAcquisition && product.saleKind === 'unknown' && lot.acquiredUnit !== 'package') {
      throw new Error('Confirm package content before recording a measured amount.');
    }
    await db['stock_lots'].upsert(lot);
  }

  public async remove(id: string): Promise<void> {
    const db = await this.database.getDb();
    const doc = await db['stock_lots'].findOne(id).exec();
    if (doc) await doc.remove();
  }

  public receive(productId: string, options: {
    packages?: number; bulkQuantity?: BaseQuantity; expiryDate?: string | null;
    shoppingListId?: string; scanId?: string;
  } = {}): Promise<StockLot> {
    const result = this.receiveQueue.then(() => this.receiveOne(productId, options));
    this.receiveQueue = result.then(() => undefined, () => undefined);
    return result;
  }

  private async receiveOne(productId: string, options: {
    packages?: number; bulkQuantity?: BaseQuantity; expiryDate?: string | null;
    shoppingListId?: string; scanId?: string;
  }): Promise<StockLot> {
    const product = await this.catalog.byId(productId);
    if (product.kind !== 'product') throw new Error('Choose a product leaf.');
    const packages = options.packages ?? 1;
    if (!Number.isInteger(packages) || packages < 1) throw new Error('Package count must be a positive whole number.');
    let acquired: BaseQuantity;
    if (product.saleKind === 'fixed') {
      acquired = {amount: packages * product.packageAmount!, unit: product.packageUnit!};
    } else if (product.saleKind === 'variable') {
      if (!options.bulkQuantity || options.bulkQuantity.unit !== product.variableUnit || options.bulkQuantity.amount <= 0) {
        throw new Error('Enter the acquired bulk quantity.');
      }
      acquired = options.bulkQuantity;
    } else {
      acquired = {amount: packages, unit: 'package'};
    }
    const id = options.scanId ?? uuidv4();
    const existing = (await this.all()).find(lot => lot.id === id);
    if (existing) {
      if (existing.productId !== productId) throw new Error('Scan ID already belongs to another product.');
      await this.shopping.reconcileCompleted(await this.all());
      return existing; // Retry after an interrupted scan must not double count.
    }
    const nodes = await this.catalog.all();
    const entries = options.shoppingListId ? await this.shopping.all(options.shoppingListId) : [];
    const lots = await this.all();
    const allocations = await this.allocate(product, acquired, product.saleKind === 'variable' ? 0 : packages, entries, lots, nodes);
    const lot: StockLot = {
      id, productId, acquiredPackages: product.saleKind === 'variable' ? 0 : packages,
      acquiredAmount: acquired.amount, acquiredUnit: acquired.unit, remainingAmount: acquired.amount,
      expiryDate: options.expiryDate ?? null, allocations, createdAt: Date.now()
    };
    await this.save(lot);
    await this.shopping.reconcileCompleted([...lots, lot]);
    return lot;
  }

  private async allocate(product: CatalogNode, acquired: BaseQuantity, packages: number,
                         entries: ShoppingEntry[], lots: StockLot[], nodes: CatalogNode[]): Promise<ScanAllocation[]> {
    const eligible = entries.filter(entry => entry.kind === 'product' && entry.targetNodeId &&
      this.catalog.matches(entry.targetNodeId, product.id, nodes));
    eligible.sort((a, b) => {
      const exactA = Number(a.targetNodeId === product.id);
      const exactB = Number(b.targetNodeId === product.id);
      return exactB - exactA || this.catalog.depth(b.targetNodeId!, nodes) - this.catalog.depth(a.targetNodeId!, nodes) ||
        Number(b.checked) - Number(a.checked) || a.createdAt - b.createdAt ||
        Number(b.needKind === 'quantity') - Number(a.needKind === 'quantity');
    });
    let remaining = acquired.amount;
    let remainingPackages = packages;
    const allocations: ScanAllocation[] = [];
    for (const entry of eligible) {
      const unit = entry.needUnit ?? 'package';
      const already = await this.shopping.progress(entry, lots);
      const outstanding = Math.max(0, (entry.needAmount ?? 1) - already);
      if (outstanding <= 0) continue;
      if (entry.needKind === 'quantity') {
        if (unit !== acquired.unit || remaining <= 0) continue;
        const amount = Math.min(outstanding, remaining);
        allocations.push({shoppingEntryId: entry.id, amount, unit});
        remaining -= amount;
        if (product.saleKind === 'fixed') {
          remainingPackages = Math.min(remainingPackages, Math.floor((remaining + 1e-9) / product.packageAmount!));
        }
      } else {
        // An unspecified need, like an exact package need, consumes whole packages.
        if (remainingPackages <= 0) continue;
        const count = Math.min(outstanding, remainingPackages);
        allocations.push({shoppingEntryId: entry.id, amount: count, unit: 'package'});
        remainingPackages -= count;
        if (product.saleKind === 'fixed') remaining = Math.max(0, remaining - count * product.packageAmount!);
        else remaining = Math.max(0, remaining - count);
      }
    }
    return allocations;
  }

  public async availability(targetNodeId: string, required: BaseQuantity): Promise<Availability> {
    const nodes = await this.catalog.all();
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const matching = (await this.all()).filter(lot => lot.remainingAmount > 0 &&
      (!lot.expiryDate || lot.expiryDate >= today) &&
      this.catalog.matches(targetNodeId, lot.productId, nodes));
    const available = matching.filter(lot => lot.acquiredUnit === required.unit)
      .reduce((sum, lot) => sum + lot.remainingAmount, 0);
    return {
      status: available >= required.amount ? 'enough' :
        matching.some(lot => lot.acquiredUnit !== required.unit) ? 'unknown' : 'insufficient',
      available, unit: required.unit
    };
  }

  public suggestedPackages(product: CatalogNode, needed: BaseQuantity): number | null {
    return product.kind === 'product' && product.saleKind === 'fixed' && product.packageUnit === needed.unit
      ? Math.ceil(needed.amount / product.packageAmount!) : null;
  }
}
