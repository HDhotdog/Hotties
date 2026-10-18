import {AppError} from '../i18n/language-pack';
import {inject, Injectable} from '@angular/core';
import {firstValueFrom, from, map, Observable, switchMap, take} from 'rxjs';
import {v4 as uuidv4} from 'uuid';
import {DatabaseService} from '../database/database';
import {CatalogService} from './catalog.service';
import {ShoppingService} from './shopping.service';
import {CatalogNode} from './catalog.model';
import {ScanAllocation, ShoppingEntry, StockLot} from './shopping.model';
import {BaseQuantity, BaseUnit} from './quantity';
import {convertQuantity, effectiveConversions} from './unit-conversion';
import {IngredientService} from '../ingredients/ingredient.service';
import {Ingredient} from '../ingredients/ingredient.dto';

export type Availability = { status: 'enough' | 'insufficient' | 'unknown'; available: number; unit: BaseUnit };
export interface CookingDeduction {
  lotId: string;
  productName: string;
  amount: number;
  unit: BaseUnit;
  remainingAmount: number;
}
export interface CookingIngredientPlan {
  ingredientId: string;
  name: string;
  required: BaseQuantity;
  used: number;
  missing: number;
  unknown: boolean;
  deductions: CookingDeduction[];
}
export interface CookingPlan {
  recipeId: string;
  operationId: string;
  fingerprint: string;
  ingredients: CookingIngredientPlan[];
  lotChanges: {lotId: string; remainingAmount: number}[];
}
export type CookingResult = {status: 'changed' | 'cooked'; plan: CookingPlan};

@Injectable({providedIn: 'root'})
export class StockService {
  private readonly database = inject(DatabaseService);
  private readonly catalog = inject(CatalogService);
  private readonly shopping = inject(ShoppingService);
  private readonly ingredients = inject(IngredientService);
  private receiveQueue: Promise<void> = Promise.resolve();
  private recoveryPromise?: Promise<void>;

  public async all(): Promise<StockLot[]> {
    await this.ensureRecovered();
    const db = await this.database.getDb();
    return (await db['stock_lots'].find().exec()).map((doc: any) => doc.toJSON() as StockLot);
  }

  public observe(): Observable<StockLot[]> {
    return from(this.ensureRecovered()).pipe(switchMap(() => this.database.getDb()),
      switchMap(db => db['stock_lots'].find().$),
      map((docs: any[]) => docs.map(doc => doc.toJSON() as StockLot)));
  }

  private ensureRecovered(): Promise<void> {
    if (!this.recoveryPromise) {
      this.recoveryPromise = this.recoverPendingCooks().catch(error => {
        this.recoveryPromise = undefined;
        throw error;
      });
    }
    return this.recoveryPromise;
  }

  private async recoverPendingCooks(): Promise<void> {
    const db = await this.database.getDb();
    const pending = (await db['settings'].find().exec()).filter((doc: any) => doc.get('key').startsWith('cook:'));
    for (const journal of pending) {
      await this.applyCookChanges(JSON.parse(journal.get('value')) as CookingPlan['lotChanges']);
      await journal.remove();
    }
  }

  public async save(lot: StockLot): Promise<void> {
    const product = await this.catalog.byId(lot.productId);
    if (product.kind !== 'product') throw new AppError('ui.stockMustReferenceAProduct', "Stock must reference a product.");
    if (!(lot.acquiredAmount > 0) || lot.remainingAmount < 0 || lot.remainingAmount > lot.acquiredAmount) {
      throw new AppError('ui.remainingStockMustBeWithinTheAcquiredQuantity', "Remaining stock must be within the acquired quantity.");
    }
    const db = await this.database.getDb();
    const previous = await db['stock_lots'].findOne(lot.id).exec();
    // Existing lots retain their acquired quantity when a product's current package changes.
    const sameAcquisition = previous && previous.productId === lot.productId &&
      previous.acquiredAmount === lot.acquiredAmount && previous.acquiredUnit === lot.acquiredUnit &&
      previous.acquiredPackages === lot.acquiredPackages;
    if (!sameAcquisition && product.saleKind === 'fixed' && (lot.acquiredUnit !== product.packageUnit ||
      lot.acquiredAmount > lot.acquiredPackages * (product.packageAmount ?? 0))) {
      throw new AppError('ui.stockExceedsTheAcquiredPackages', "Stock exceeds the acquired packages.");
    }
    if (!sameAcquisition && product.saleKind === 'variable' && lot.acquiredUnit !== product.variableUnit) {
      throw new AppError('ui.stockUnitDoesNotMatchThisProduct', "Stock unit does not match this product.");
    }
    if (!sameAcquisition && product.saleKind === 'unknown' && lot.acquiredUnit !== 'package') {
      throw new AppError('ui.confirmPackageContentBeforeRecordingAMeasuredAmount', "Confirm package content before recording a measured amount.");
    }
    await db['stock_lots'].upsert(lot);
  }

  public async remove(id: string): Promise<void> {
    const db = await this.database.getDb();
    const doc = await db['stock_lots'].findOne(id).exec();
    if (doc) {
      await this.shopping.retireAllocations(doc.toJSON() as StockLot);
      await doc.remove();
    }
  }

  /** Preview one batch, using a shared remaining balance across its ingredients. */
  public async planCook(recipeId: string): Promise<CookingPlan> {
    const [ingredients, nodes, lots] = await Promise.all([
      firstValueFrom(this.ingredients.getIngredientsForRecipe(recipeId).pipe(take(1))),
      this.catalog.all(), this.all()
    ]);
    return this.buildCookingPlan(recipeId, ingredients, nodes, lots);
  }

  public cook(recipeId: string, reviewed: CookingPlan): Promise<CookingResult> {
    const result = this.receiveQueue.then(async (): Promise<CookingResult> => {
      if (recipeId !== reviewed.recipeId) throw new AppError('ui.recipeChangedPleaseReviewAgain', "Recipe changed. Please review again.");
      const db = await this.database.getDb();
      const journalKey = `cook:${reviewed.operationId}`;
      const journal = await db['settings'].findOne(journalKey).exec();
      if (!journal) {
        const current = await this.planCook(recipeId);
        if (current.fingerprint !== reviewed.fingerprint) return {status: 'changed', plan: current};
        if (!current.ingredients.length) throw new AppError('ui.thisRecipeHasNoIngredients', "This recipe has no ingredients.");
        // Absolute target balances make a retry after an interrupted write safe.
        await db['settings'].upsert({key: journalKey, value: JSON.stringify(reviewed.lotChanges)});
      }
      const changes = journal ? JSON.parse(journal.get('value')) as CookingPlan['lotChanges'] : reviewed.lotChanges;
      await this.applyCookChanges(changes);
      await (await db['settings'].findOne(journalKey).exec())?.remove();
      return {status: 'cooked', plan: reviewed};
    });
    this.receiveQueue = result.then(() => undefined, () => undefined);
    return result;
  }

  private async applyCookChanges(changes: CookingPlan['lotChanges']): Promise<void> {
    const db = await this.database.getDb();
    for (const change of changes) {
      const doc = await db['stock_lots'].findOne(change.lotId).exec();
      const lot = doc?.toJSON() as StockLot | undefined;
      if (!lot) continue; // Already removed by an interrupted attempt.
      if (change.remainingAmount <= 1e-9) await this.remove(change.lotId);
      else if (lot.remainingAmount > change.remainingAmount + 1e-9) {
        await this.save({...lot, remainingAmount: change.remainingAmount});
      }
    }
  }

  private buildCookingPlan(recipeId: string, ingredients: Ingredient[], nodes: CatalogNode[], lots: StockLot[]): CookingPlan {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const fingerprint = JSON.stringify({today, ingredients: [...ingredients].sort((a, b) => a.id.localeCompare(b.id)),
      nodes: [...nodes].sort((a, b) => a.id.localeCompare(b.id)),
      lots: [...lots].sort((a, b) => a.id.localeCompare(b.id))});
    const remaining = new Map(lots.map(lot => [lot.id, lot.remainingAmount]));
    const sorted = [...ingredients].sort((a, b) => {
      const nodeA = nodes.find(node => node.id === a.targetNodeId);
      const nodeB = nodes.find(node => node.id === b.targetNodeId);
      return Number(nodeB?.kind === 'product') - Number(nodeA?.kind === 'product') ||
        this.catalog.depth(b.targetNodeId ?? '', nodes) -
        this.catalog.depth(a.targetNodeId ?? '', nodes) || a.id.localeCompare(b.id);
    });
    const planned = new Map<string, CookingIngredientPlan>();
    for (const ingredient of sorted) {
      const required = {amount: ingredient.amount, unit: ingredient.unit as BaseUnit};
      let outstanding = required.amount;
      let unknown = false;
      const deductions: CookingDeduction[] = [];
      const matching = lots.filter(lot => lot.remainingAmount > 0 &&
        (!lot.expiryDate || lot.expiryDate >= today) && !!ingredient.targetNodeId &&
        this.catalog.matches(ingredient.targetNodeId, lot.productId, nodes)).sort((a, b) =>
        (a.expiryDate ?? '9999-12-31').localeCompare(b.expiryDate ?? '9999-12-31') ||
        a.createdAt - b.createdAt || a.id.localeCompare(b.id));
      for (const lot of matching) {
        const available = remaining.get(lot.id) ?? 0;
        if (available <= 1e-9) continue;
        const product = nodes.find(node => node.id === lot.productId);
        if (!product) { unknown = true; continue; }
        const conversions = effectiveConversions(product, nodes);
        const converted = convertQuantity({amount: available, unit: lot.acquiredUnit}, required.unit, conversions);
        if (converted === null) { unknown = true; continue; }
        if (outstanding <= 1e-9 || converted <= 0) continue;
        const used = Math.min(outstanding, converted);
        const nativeAmount = convertQuantity({amount: used, unit: required.unit}, lot.acquiredUnit, conversions);
        if (nativeAmount === null) continue;
        const after = Math.max(0, available - nativeAmount);
        remaining.set(lot.id, after <= 1e-9 ? 0 : after);
        deductions.push({lotId: lot.id, productName: product.name, amount: Math.min(available, nativeAmount),
          unit: lot.acquiredUnit, remainingAmount: remaining.get(lot.id)!});
        outstanding = Math.max(0, outstanding - used);
      }
      planned.set(ingredient.id, {ingredientId: ingredient.id, name: ingredient.name, required,
        used: required.amount - outstanding, missing: outstanding, unknown, deductions});
    }
    return {recipeId, operationId: uuidv4(), fingerprint, ingredients: ingredients.map(item => planned.get(item.id)!),
      lotChanges: lots.filter(lot => (remaining.get(lot.id) ?? lot.remainingAmount) < lot.remainingAmount - 1e-9 ||
          ((remaining.get(lot.id) ?? lot.remainingAmount) === 0 && lot.remainingAmount > 0))
        .map(lot => ({lotId: lot.id, remainingAmount: remaining.get(lot.id)!}))};
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
    if (product.kind !== 'product') throw new AppError('ui.chooseAProductLeaf', "Choose a product leaf.");
    const packages = options.packages ?? 1;
    if (!Number.isInteger(packages) || packages < 1) throw new AppError('ui.packageCountMustBeAPositiveWholeNumber', "Package count must be a positive whole number.");
    let acquired: BaseQuantity;
    if (product.saleKind === 'fixed') {
      acquired = {amount: packages * product.packageAmount!, unit: product.packageUnit!};
    } else if (product.saleKind === 'variable') {
      if (!options.bulkQuantity || options.bulkQuantity.unit !== product.variableUnit || options.bulkQuantity.amount <= 0) {
        throw new AppError('ui.enterTheAcquiredBulkQuantity', "Enter the acquired bulk quantity.");
      }
      acquired = options.bulkQuantity;
    } else {
      acquired = {amount: packages, unit: 'package'};
    }
    const id = options.scanId ?? uuidv4();
    const existing = (await this.all()).find(lot => lot.id === id);
    if (existing) {
      if (existing.productId !== productId) throw new AppError('ui.scanIdAlreadyBelongsToAnotherProduct', "Scan ID already belongs to another product.");
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
    const conversions = effectiveConversions(product, nodes);
    for (const entry of eligible) {
      const unit = entry.needUnit ?? 'package';
      const already = await this.shopping.progress(entry, lots);
      const outstanding = Math.max(0, (entry.needAmount ?? 1) - already);
      if (outstanding <= 0) continue;
      if (entry.needKind === 'quantity') {
        const convertible = convertQuantity({amount: remaining, unit: acquired.unit}, unit, conversions);
        if (convertible === null || convertible <= 0) continue;
        const amount = Math.min(outstanding, convertible);
        const consumed = convertQuantity({amount, unit}, acquired.unit, conversions)!;
        allocations.push({shoppingEntryId: entry.id, amount, unit});
        remaining = Math.max(0, remaining - consumed);
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
    let available = 0;
    let unknown = false;
    for (const lot of matching) {
      const product = nodes.find(node => node.id === lot.productId);
      const converted = product && convertQuantity(
        {amount: lot.remainingAmount, unit: lot.acquiredUnit}, required.unit,
        effectiveConversions(product, nodes));
      if (converted === null || converted === undefined) unknown = true;
      else available += converted;
    }
    return {
      status: available + 1e-9 >= required.amount ? 'enough' : unknown ? 'unknown' : 'insufficient',
      available, unit: required.unit
    };
  }

  public suggestedPackages(product: CatalogNode, needed: BaseQuantity, nodes: CatalogNode[]): number | null {
    if (product.kind !== 'product' || product.saleKind !== 'fixed' || !product.packageUnit || !product.packageAmount) {
      return null;
    }
    const perPackage = convertQuantity({amount: product.packageAmount, unit: product.packageUnit},
      needed.unit, effectiveConversions(product, nodes));
    return perPackage === null ? null : Math.ceil(needed.amount / perPackage - 1e-9);
  }
}
