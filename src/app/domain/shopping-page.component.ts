import {CommonModule} from '@angular/common';
import {ChangeDetectorRef, Component, ElementRef, inject, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {Router} from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonToolbar,
  MenuController
} from '@ionic/angular';
import {firstValueFrom, Subscription, take} from 'rxjs';
import {v4 as uuidv4} from 'uuid';
import {CategoryService} from '../category/category.service';
import {Category} from '../category/category.dto';
import {CatalogService} from './catalog.service';
import {CatalogNode} from './catalog.model';
import {ShoppingService} from './shopping.service';
import {StockService} from './stock.service';
import {NeedKind, ShoppingEntry, StockLot} from './shopping.model';
import {normalizeQuantity, QuantityUnit} from './quantity';
import {OfflineSpeech} from './offline-speech';
import {CategorySuggestionService} from './category-suggestion.service';
import {ShoppingSentenceService} from './shopping-sentence.service';
import {normalizedCatalogName, ParsedShoppingItem} from './shopping-sentence';

interface ShoppingReviewRow extends ParsedShoppingItem {
  id: string;
  targetNodeId: string;
  suggestedProductIds: string[];
  ranking: boolean;
}

@Component({
  selector: 'app-shopping-page', standalone: true,
  imports: [CommonModule, FormsModule, IonButton, IonButtons, IonContent, IonFooter, IonHeader, IonIcon, IonToolbar],
  templateUrl: './shopping-page.component.html',
  styleUrls: ['./shopping-page.component.scss']
})
export class ShoppingPageComponent implements OnInit, OnDestroy {
  @ViewChild('quickInput') private quickInput?: ElementRef<HTMLInputElement>;
  private readonly menu = inject(MenuController);
  private readonly router = inject(Router);
  private readonly categories = inject(CategoryService);
  private readonly catalog = inject(CatalogService);
  private readonly shopping = inject(ShoppingService);
  private readonly stock = inject(StockService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly categorySuggestions = inject(CategorySuggestionService);
  private readonly sentenceParser = inject(ShoppingSentenceService);
  private readonly subscriptions = new Subscription();
  private entriesSubscription?: Subscription;
  public lists: Category[] = [];
  public selectedListId = '';
  public entries: ShoppingEntry[] = [];
  public nodes: CatalogNode[] = [];
  public lots: StockLot[] = [];
  public kind: 'product' | 'task' = 'product';
  public selectedNodeId = '';
  public newName = '';
  public needKind: NeedKind = 'unspecified';
  public needAmount = 1;
  public needUnit: QuantityUnit = 'piece';
  public readonly units: QuantityUnit[] = ['g', 'kg', 'ml', 'l', 'piece', 'bunch', 'pinch'];
  public error = '';
  public suggestionProductIds: Record<string, string> = {};
  public detailsOpen = false;
  public suggestionsOpen = false;
  public expandedEntryId: string | null = null;
  public adding = false;
  public voiceSupported = false;
  public listening = false;
  public parsing = false;
  public sentenceOpen = false;
  public sentenceText = '';
  public reviewRows: ShoppingReviewRow[] = [];
  public reviewListId = '';
  private reviewVersion = 0;
  public readonly sentenceUnits: Array<QuantityUnit | null> = [null, 'piece', 'package', 'g', 'kg', 'ml', 'l', 'bunch', 'pinch'];

  public async ngOnInit(): Promise<void> {
    void OfflineSpeech.available().then(available => {
      this.voiceSupported = available;
      this.cdr.markForCheck();
    }).catch(() => { this.voiceSupported = false; });
    this.sentenceParser.warmUp();
    this.subscriptions.add(this.catalog.observe().subscribe(nodes => {
      this.nodes = nodes;
      this.cdr.detectChanges();
    }));
    this.subscriptions.add(this.stock.observe().subscribe(lots => {
      this.lots = lots;
      this.cdr.detectChanges();
    }));
    this.lists = await firstValueFrom(this.categories.getCategories().pipe(take(1)));
    if (!this.lists.length) {
      const created = await firstValueFrom(this.categories.save({
        id: uuidv4(),
        name: 'Shopping',
        saveSuggestions: true
      }));
      this.lists = [created];
    }
    const previousId = await firstValueFrom(this.categories.getSelectedCategoryId());
    this.selectedListId = this.lists.some(list => list.id === previousId) ? previousId! : this.lists[0].id;
    this.selectList();
    await this.shopping.reconcileCompleted(await this.stock.all());
    this.cdr.detectChanges();
  }

  public ngOnDestroy(): void {
    this.reviewVersion++;
    if (this.listening) void OfflineSpeech.cancel();
    this.sentenceParser.cancel();
    this.entriesSubscription?.unsubscribe();
    this.subscriptions.unsubscribe();
  }

  public openMenu(): void {
    void this.menu.open('main-menu');
  }

  public openScanner(): void {
    void this.router.navigate(['/tabs/todo/scan']);
  }

  public selectList(): void {
    this.entriesSubscription?.unsubscribe();
    if (this.selectedListId) this.entriesSubscription = this.shopping.observe(this.selectedListId).subscribe(entries => {
      this.entries = entries;
      this.cdr.detectChanges();
    });
    const selected = this.lists.find(list => list.id === this.selectedListId);
    if (selected) void firstValueFrom(this.categories.saveCurrentCategory(selected));
  }

  public get nodesForSelection(): CatalogNode[] {
    return this.nodes.filter(node => node.parentId !== null);
  }

  public get suggestions(): CatalogNode[] {
    const query = this.newName.trim().toLocaleLowerCase();
    if (!query || this.kind === 'task' || !this.suggestionsOpen) return [];
    return this.nodesForSelection.filter(node =>
      `${node.name} ${node.brand ?? ''}`.toLocaleLowerCase().includes(query))
      .sort((a, b) => Number(b.name.toLocaleLowerCase() === query) - Number(a.name.toLocaleLowerCase() === query) ||
        Number(a.kind === 'product') - Number(b.kind === 'product') || a.name.localeCompare(b.name))
      .slice(0, 5);
  }

  public get selectedProduct(): CatalogNode | null {
    const node = this.nodes.find(item => item.id === this.selectedNodeId);
    return node?.kind === 'product' ? node : null;
  }

  public get suggestedPackages(): number | null {
    if (!this.selectedProduct || this.needKind !== 'quantity') return null;
    try {
      return this.stock.suggestedPackages(this.selectedProduct, normalizeQuantity({
        amount: this.needAmount,
        unit: this.needUnit
      }));
    } catch {
      return null;
    }
  }

  public nodeLabel(node: CatalogNode): string {
    return `${node.kind === 'class' ? 'Any' : 'Product'} · ${node.name}${node.brand ? ' · ' + node.brand : ''}`;
  }

  public entryTitle(entry: ShoppingEntry): string {
    const node = this.nodes.find(item => item.id === entry.targetNodeId);
    return `${entry.label}${node?.brand ? ' · ' + node.brand : ''}`;
  }

  public needLabel(entry: ShoppingEntry): string {
    if (entry.needKind === 'unspecified') return 'Any brand';
    if (entry.needKind === 'packages') return `${entry.needAmount} pkg`;
    return `${entry.needAmount} ${entry.needUnit}`;
  }

  public progress(entry: ShoppingEntry): number {
    return this.lots.flatMap(lot => lot.allocations).filter(a => a.shoppingEntryId === entry.id &&
      a.unit === (entry.needUnit ?? 'package')).reduce((sum, a) => sum + a.amount, 0);
  }

  public remainingLabel(entry: ShoppingEntry): string {
    return `${Math.max(0, (entry.needAmount ?? 1) - this.progress(entry))} ${entry.needUnit ?? 'package'}`;
  }

  public matchingProducts(entry: ShoppingEntry): CatalogNode[] {
    return this.nodes.filter(node => node.kind === 'product' && !!entry.targetNodeId &&
      this.catalog.matches(entry.targetNodeId, node.id, this.nodes));
  }

  public suggestedPackagesForEntry(entry: ShoppingEntry): number | null {
    const product = this.nodes.find(node => node.id === this.suggestionProductIds[entry.id]);
    if (!product || !entry.needUnit) return null;
    return this.stock.suggestedPackages(product, {
      amount: Math.max(0, (entry.needAmount ?? 0) - this.progress(entry)),
      unit: entry.needUnit
    });
  }

  public inputChanged(value: string): void {
    this.newName = value;
    this.selectedNodeId = '';
    this.suggestionsOpen = true;
    this.error = '';
    if (this.needKind === 'packages') this.needKind = 'unspecified';
  }

  public chooseSuggestion(node: CatalogNode): void {
    this.newName = node.name;
    this.selectedNodeId = node.id;
    this.needKind = node.kind === 'product' ? 'packages' : 'unspecified';
    this.needAmount = 1;
    this.suggestionsOpen = false;
    if (!this.detailsOpen) void this.add();
  }

  public toggleDetails(): void {
    this.detailsOpen = !this.detailsOpen;
    this.suggestionsOpen = this.detailsOpen && !!this.newName.trim();
    if (!this.newName.trim()) this.quickInput?.nativeElement.focus();
  }

  public toggleEntryDetails(entry: ShoppingEntry): void {
    this.expandedEntryId = this.expandedEntryId === entry.id ? null : entry.id;
  }

  public async add(): Promise<void> {
    if (this.adding) return;
    this.error = '';
    this.adding = true;
    try {
      if (!this.selectedListId) throw new Error('Create a shopping list first.');
      if (this.kind === 'task') await this.shopping.addTask(this.selectedListId, this.newName);
      else {
        const typed = this.newName.trim().toLocaleLowerCase();
        const exactClass = this.nodesForSelection.find(node => node.kind === 'class' && node.name.toLocaleLowerCase() === typed);
        const exactProduct = this.nodesForSelection.find(node => node.kind === 'product' && node.name.toLocaleLowerCase() === typed);
        const targetNode = this.selectedNodeId ? this.nodes.find(node => node.id === this.selectedNodeId) : exactClass ?? exactProduct;
        const target = targetNode?.id ?? (await this.catalog.findOrCreateClass(this.newName)).id;
        const needKind = this.detailsOpen ? this.needKind : targetNode?.kind === 'product' ? 'packages' : 'unspecified';
        if (needKind === 'quantity') await this.shopping.addProduct(this.selectedListId, target,
          {kind: 'quantity', quantity: normalizeQuantity({amount: this.needAmount, unit: this.needUnit})});
        else if (needKind === 'packages') await this.shopping.addProduct(this.selectedListId, target,
          {kind: 'packages', count: this.needAmount});
        else await this.shopping.addProduct(this.selectedListId, target, {kind: 'unspecified'});
      }
      this.newName = '';
      this.selectedNodeId = '';
      this.needKind = 'unspecified';
      this.needAmount = 1;
      this.kind = 'product';
      this.suggestionsOpen = false;
      this.quickInput?.nativeElement.focus();
    } catch (error) {
      this.error = String(error instanceof Error ? error.message : error);
    } finally {
      this.adding = false;
      this.cdr.detectChanges();
    }
  }

  public async toggle(entry: ShoppingEntry): Promise<void> {
    await this.shopping.toggleChecked(entry);
  }

  public async remove(entry: ShoppingEntry): Promise<void> {
    await this.shopping.remove(entry.id);
  }

  public openSentence(): void {
    this.sentenceOpen = true;
    this.reviewListId = this.selectedListId;
  }

  public async startSentenceVoice(): Promise<void> {
    if (!this.voiceSupported || this.listening || this.parsing) return;
    this.openSentence();
    const version = this.reviewVersion;
    this.error = '';
    this.listening = true;
    this.cdr.markForCheck();
    try {
      const transcription = await OfflineSpeech.listen();
      if (version !== this.reviewVersion) return;
      this.sentenceText = transcription;
      await this.parseSentence();
    } catch (error) {
      if (version === this.reviewVersion) this.error = error instanceof Error ? error.message : String(error);
    } finally {
      this.listening = false;
      this.cdr.markForCheck();
    }
  }

  public async parseSentence(): Promise<void> {
    if (this.parsing || !this.sentenceText.trim()) return;
    const version = ++this.reviewVersion;
    this.error = '';
    this.parsing = true;
    this.reviewRows = [];
    this.reviewListId = this.selectedListId;
    this.cdr.markForCheck();
    try {
      const parsed = await this.sentenceParser.parse(this.sentenceText);
      if (version !== this.reviewVersion) return;
      this.reviewRows = parsed.map(item => ({...item, id: uuidv4(), targetNodeId: '', suggestedProductIds: [], ranking: false}));
      for (const row of this.reviewRows) void this.suggestMatches(row, version);
    } catch (error) {
      if (version !== this.reviewVersion) return;
      this.error = error instanceof Error ? error.message : String(error);
      this.reviewRows = [{id: uuidv4(), name: this.sentenceText.trim(), amount: 1, unit: null,
        targetNodeId: '', suggestedProductIds: [], ranking: false}];
    } finally {
      if (version === this.reviewVersion) {
        this.parsing = false;
        this.cdr.markForCheck();
      }
    }
  }

  public reviewNameChanged(row: ShoppingReviewRow): void {
    row.targetNodeId = '';
    row.suggestedProductIds = [];
  }

  public async suggestMatches(row: ShoppingReviewRow, version = this.reviewVersion): Promise<void> {
    const normalized = normalizedCatalogName(row.name);
    const products = this.nodes.filter(node => node.kind === 'product');
    const exact = products.filter(node => normalizedCatalogName(node.name) === normalized);
    row.targetNodeId = exact.length === 1 ? exact[0].id : '';
    row.ranking = true;
    this.cdr.markForCheck();
    try {
      const ids = await this.categorySuggestions.rankProducts(row.name, this.nodes);
      if (version === this.reviewVersion && this.reviewRows.includes(row) &&
        normalizedCatalogName(row.name) === normalized) row.suggestedProductIds = ids;
    } catch {
      if (version === this.reviewVersion && this.reviewRows.includes(row)) row.suggestedProductIds = [];
    } finally {
      row.ranking = false;
      this.cdr.markForCheck();
    }
  }

  public reviewCandidates(row: ShoppingReviewRow): CatalogNode[] {
    const normalized = normalizedCatalogName(row.name);
    const candidates = [
      this.nodes.find(node => node.id === row.targetNodeId),
      ...row.suggestedProductIds.map(id => this.nodes.find(node => node.id === id)),
      ...this.nodes.filter(node => node.parentId !== null && normalizedCatalogName(node.name).includes(normalized))
    ];
    const seen = new Set<string>();
    const result: CatalogNode[] = [];
    for (const node of candidates) {
      if (!node?.parentId || seen.has(node.id)) continue;
      seen.add(node.id);
      result.push(node);
      if (result.length === 12) break;
    }
    return result;
  }

  public addReviewRow(): void {
    if (this.reviewRows.length >= 12) return;
    this.reviewRows.push({id: uuidv4(), name: '', amount: 1, unit: null, targetNodeId: '',
      suggestedProductIds: [], ranking: false});
  }

  public removeReviewRow(row: ShoppingReviewRow): void {
    this.reviewRows = this.reviewRows.filter(item => item !== row);
  }

  public cancelSentence(): void {
    this.reviewVersion++;
    if (this.listening) void OfflineSpeech.cancel();
    this.sentenceParser.cancel();
    this.listening = false;
    this.parsing = false;
    this.sentenceOpen = false;
    this.reviewRows = [];
    this.error = '';
  }

  public async addSentenceItems(): Promise<void> {
    if (this.adding || this.parsing) return;
    this.error = '';
    this.adding = true;
    try {
      if (!this.reviewListId || !this.reviewRows.length) throw new Error('Review at least one item.');
      for (const row of this.reviewRows) {
        const name = row.name.trim();
        if (!name) throw new Error('Each item needs a name.');
        if (row.amount !== null && (!Number.isFinite(Number(row.amount)) || Number(row.amount) <= 0)) {
          throw new Error(`Enter a valid amount for ${name}.`);
        }
        if (!row.targetNodeId) throw new Error(`Choose a catalog item or create a class for ${name}.`);
      }
      for (const row of this.reviewRows) {
        const target = row.targetNodeId === '__new__' ?
          (await this.catalog.findOrCreateClass(row.name)).id : row.targetNodeId;
        const amount = row.amount === null ? 1 : Number(row.amount);
        if (row.unit === 'package') {
          await this.shopping.addProduct(this.reviewListId, target, {kind: 'packages', count: amount}, row.id);
        } else if (row.unit || amount !== 1) {
          await this.shopping.addProduct(this.reviewListId, target,
            {kind: 'quantity', quantity: normalizeQuantity({amount, unit: row.unit ?? 'piece'})}, row.id);
        } else {
          await this.shopping.addProduct(this.reviewListId, target, {kind: 'unspecified'}, row.id);
        }
      }
      this.cancelSentence();
    } catch (error) {
      this.error = error instanceof Error ? error.message : String(error);
    } finally {
      this.adding = false;
      this.cdr.markForCheck();
    }
  }
}
