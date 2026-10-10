import {inject, Injectable} from '@angular/core';
import {from, map, Observable, switchMap} from 'rxjs';
import {v4 as uuidv4} from 'uuid';
import {DatabaseService} from '../database/database';
import {CatalogService} from './catalog.service';
import {NeedKind, ShoppingEntry, StockLot} from './shopping.model';
import {BaseQuantity} from './quantity';

@Injectable({providedIn: 'root'})
export class ShoppingService {
  private readonly database = inject(DatabaseService);
  private readonly catalog = inject(CatalogService);

  public async all(listId?: string): Promise<ShoppingEntry[]> {
    const db = await this.database.getDb();
    const docs = await db['shopping_entries'].find().exec();
    const entries = docs.map((doc: any) => doc.toJSON() as ShoppingEntry);
    return listId ? entries.filter(entry => entry.shoppingListId === listId) : entries;
  }

  public observe(listId: string): Observable<ShoppingEntry[]> {
    return from(this.database.getDb()).pipe(switchMap(db => db['shopping_entries'].find().$),
      map((docs: any[]) => docs.map(doc => doc.toJSON() as ShoppingEntry)
        .filter(entry => entry.shoppingListId === listId)
        .sort((a, b) => Number(a.checked) - Number(b.checked) || a.createdAt - b.createdAt)));
  }

  public async addProduct(listId: string, targetNodeId: string | undefined, need: {
    kind: NeedKind;
    quantity?: BaseQuantity | null;
    count?: number
  }, name?: string): Promise<ShoppingEntry> {
    const node = await this.catalog.findById(targetNodeId);
    if (need.kind === 'packages' && node?.kind !== 'product') throw new Error('Package counts require an exact product.');
    const amount = need.kind === 'quantity' ? need.quantity?.amount : need.kind === 'packages' ? need.count : null;
    const unit = need.kind === 'quantity' ? need.quantity?.unit : need.kind === 'packages' ? 'package' : null;
    if (need.kind !== 'unspecified' && (!(amount && Number.isFinite(amount) && amount > 0) || !unit)) {
      throw new Error('Enter a valid shopping quantity.');
    }
    const entry: ShoppingEntry = {
      id: uuidv4(), shoppingListId: listId, kind: 'product', targetNodeId,
      label: node?.name ?? name, needKind: need.kind, needAmount: amount ?? null, needUnit: unit ?? null,
      checked: false, createdAt: Date.now(), retiredAllocations: []
    };
    await this.save(entry);
    return entry;
  }

  public async addTask(listId: string, label: string): Promise<ShoppingEntry> {
    const entry: ShoppingEntry = {
      id: uuidv4(),
      shoppingListId: listId,
      kind: 'task',
      targetNodeId: null,
      label: label.trim(),
      needKind: 'unspecified',
      needAmount: null,
      needUnit: null,
      checked: false,
      createdAt: Date.now(),
      retiredAllocations: []
    };
    await this.save(entry);
    return entry;
  }

  public async save(entry: ShoppingEntry): Promise<void> {
    if (!entry.label?.trim()) throw new Error('A shopping entry needs a name.');
    const db = await this.database.getDb();
    await db['shopping_entries'].upsert({...entry, retiredAllocations: entry.retiredAllocations ?? []});
  }

  public async toggleChecked(entry: ShoppingEntry): Promise<void> {
    await this.save({...entry, checked: !entry.checked});
  }

  public async remove(id: string): Promise<void> {
    const db = await this.database.getDb();
    const doc = await db['shopping_entries'].findOne(id).exec();
    if (doc) await doc.remove();
  }

  public async clearList(listId: string): Promise<void> {
    for (const entry of await this.all(listId)) await this.remove(entry.id);
  }

  public async progress(entry: ShoppingEntry, lots?: StockLot[]): Promise<number> {
    const db = await this.database.getDb();
    const stock = lots ?? (await db['stock_lots'].find().exec()).map((doc: any) => doc.toJSON() as StockLot);
    const current = (await db['shopping_entries'].findOne(entry.id).exec())?.toJSON() as ShoppingEntry | undefined;
    return this.progressFrom(current ?? entry, stock);
  }

  public progressFrom(entry: ShoppingEntry, lots: StockLot[]): number {
    const unit = entry.needUnit ?? 'package';
    const retired = (entry.retiredAllocations ?? []).filter(allocation => allocation.unit === unit);
    const retiredIds = new Set(retired.map(allocation => allocation.lotId));
    const active = lots.filter(lot => !retiredIds.has(lot.id)).flatMap(lot => lot.allocations)
      .filter(allocation => allocation.shoppingEntryId === entry.id && allocation.unit === unit)
      .reduce((sum, allocation) => sum + allocation.amount, 0);
    return active + retired.reduce((sum, allocation) => sum + allocation.amount, 0);
  }

  /** Save each allocation before deleting its lot. Repeating this transfer is harmless. */
  public async retireAllocations(lot: StockLot): Promise<void> {
    const entries = await this.all();
    for (const entry of entries) {
      const matching = lot.allocations.filter(allocation => allocation.shoppingEntryId === entry.id);
      if (!matching.length || (entry.retiredAllocations ?? []).some(item => item.lotId === lot.id)) continue;
      await this.save({...entry, retiredAllocations: [...(entry.retiredAllocations ?? []),
        ...matching.map(allocation => ({lotId: lot.id, amount: allocation.amount, unit: allocation.unit}))]});
    }
  }

  public async reconcileCompleted(lots: StockLot[]): Promise<void> {
    for (const entry of await this.all()) {
      if (entry.kind === 'task') continue;
      const fulfilled = await this.progress(entry, lots);
      if (fulfilled >= (entry.needAmount ?? 1) - 1e-9) await this.remove(entry.id);
    }
  }
}
