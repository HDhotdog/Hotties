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
  IonTitle,
  IonToolbar,
  MenuController
} from '@ionic/angular';
import {Subscription} from 'rxjs';
import {v4 as uuidv4} from 'uuid';
import {CatalogService} from './catalog.service';
import {CatalogNode} from './catalog.model';
import {StockService} from './stock.service';
import {StockLot} from './shopping.model';
import {BaseUnit, formatQuantity} from './quantity';
import {parseGermanStockInput} from './german-stock-input';
import {OfflineSpeech} from './offline-speech';
import {CategorySuggestionService} from './category-suggestion.service';

interface StockReview {
  stockId: string;
  name: string;
  count: number | null;
  productId: string;
  categoryId: string;
  newCategoryName: string;
  bulkAmount: number | null;
  suggestedIds: string[];
  ranking: boolean;
  categoryError: boolean;
}

@Component({
  selector: 'app-stock-page', standalone: true,
  imports: [CommonModule, FormsModule, IonButton, IonButtons, IonContent, IonFooter, IonHeader, IonIcon, IonTitle, IonToolbar],
  templateUrl: './stock-page.component.html',
  styleUrls: ['./stock-page.component.scss']
})
export class StockPageComponent implements OnInit, OnDestroy {
  @ViewChild('quickInput') private quickInput?: ElementRef<HTMLInputElement>;
  @ViewChild('bulkInput') private bulkInput?: ElementRef<HTMLInputElement>;
  private readonly menu = inject(MenuController);
  private readonly router = inject(Router);
  private readonly catalog = inject(CatalogService);
  private readonly stock = inject(StockService);
  private readonly categorySuggestions = inject(CategorySuggestionService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly subscriptions = new Subscription();
  public nodes: CatalogNode[] = [];
  public lots: StockLot[] = [];
  public productId = '';
  public packages = 1;
  public bulkAmount = 1;
  public remainingAmount = 0;
  public expiryDate = '';
  public editing: StockLot | null = null;
  public error = '';
  public quickName = '';
  public detailsOpen = false;
  public suggestionsOpen = false;
  public adding = false;
  public review: StockReview | null = null;
  public voiceSupported = false;
  public listening = false;
  public success = '';
  private reviewVersion = 0;
  private reviewTimer: ReturnType<typeof setTimeout> | null = null;

  public ngOnInit(): void {
    void OfflineSpeech.available().then(available => {
      this.voiceSupported = available;
      this.cdr.markForCheck();
    }).catch(() => { this.voiceSupported = false; });
    this.subscriptions.add(this.catalog.observe().subscribe(nodes => {
      this.nodes = nodes;
      this.cdr.detectChanges();
    }));
    this.subscriptions.add(this.stock.observe().subscribe(lots => {
      this.lots = lots;
      this.cdr.detectChanges();
    }));
  }

  public ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    if (this.listening) void OfflineSpeech.cancel();
    this.reviewVersion++;
    if (this.reviewTimer) clearTimeout(this.reviewTimer);
  }

  public get foodClasses(): CatalogNode[] {
    return this.nodes.filter(node => node.kind === 'class' && node.parentId !== null &&
      this.catalog.matches('root-food', node.id, this.nodes));
  }

  public get reviewProduct(): CatalogNode | null {
    return this.products.find(node => node.id === this.review?.productId) ?? null;
  }

  public get reviewSuggestions(): CatalogNode[] {
    return (this.review?.suggestedIds ?? []).map(id => this.nodes.find(node => node.id === id))
      .filter((node): node is CatalogNode => !!node);
  }

  public async startVoice(): Promise<void> {
    if (!this.voiceSupported || this.listening || this.adding) return;
    this.error = '';
    this.success = '';
    this.listening = true;
    this.cdr.markForCheck();
    try {
      const text = await OfflineSpeech.listen();
      await this.prepareReview(text);
    } catch (error) {
      this.error = String(error instanceof Error ? error.message : error);
    } finally {
      this.listening = false;
      this.cdr.markForCheck();
    }
  }

  public async prepareReview(raw: string, selectedNode?: CatalogNode): Promise<void> {
    const parsed = parseGermanStockInput(raw);
    this.error = '';
    this.success = '';
    if (!parsed.name) {
      this.error = 'Enter or say a product name.';
      return;
    }
    this.review = {
      stockId: uuidv4(),
      name: parsed.name, count: parsed.count,
      productId: selectedNode?.kind === 'product' ? selectedNode.id : '',
      categoryId: selectedNode?.kind === 'class' ? selectedNode.id : '',
      newCategoryName: '', bulkAmount: null, suggestedIds: [], ranking: false, categoryError: false
    };
    this.suggestionsOpen = false;
    await this.refreshReview();
  }

  public reviewNameChanged(name: string): void {
    if (!this.review) return;
    this.review.name = name;
    this.review.productId = '';
    this.review.categoryId = '';
    this.review.newCategoryName = '';
    this.reviewVersion++;
    if (this.reviewTimer) clearTimeout(this.reviewTimer);
    this.reviewTimer = setTimeout(() => {
      this.reviewTimer = null;
      void this.refreshReview();
    }, 250);
  }

  private findProductByName(name: string): CatalogNode | null {
    const normalized = name.trim().toLocaleLowerCase('de-DE');
    const exact = this.products.find(node => node.name.toLocaleLowerCase('de-DE') === normalized);
    if (exact) return exact;
    // Resolve common German plurals against existing catalog names without
    // rewriting a new product's name or assuming a general lemmatizer.
    if (normalized.endsWith('n')) {
      return this.products.find(node => node.name.toLocaleLowerCase('de-DE') === normalized.slice(0, -1)) ?? null;
    }
    return null;
  }

  private async refreshReview(): Promise<void> {
    const review = this.review;
    if (!review) return;
    const version = ++this.reviewVersion;
    const product = review.productId ? this.products.find(node => node.id === review.productId) :
      this.findProductByName(review.name);
    if (product) {
      review.productId = product.id;
      review.categoryId = product.parentId ?? '';
      review.suggestedIds = [];
      review.ranking = false;
      this.cdr.markForCheck();
      return;
    }
    review.productId = '';
    review.suggestedIds = [];
    review.ranking = this.foodClasses.length > 0;
    review.categoryError = false;
    this.cdr.markForCheck();
    if (!review.ranking) return;
    try {
      const ids = await this.categorySuggestions.rank(review.name, this.nodes);
      if (this.review === review && version === this.reviewVersion) review.suggestedIds = ids;
    } catch {
      if (this.review === review && version === this.reviewVersion) review.categoryError = true;
    } finally {
      if (this.review === review && version === this.reviewVersion) {
        review.ranking = false;
        this.cdr.markForCheck();
      }
    }
  }

  public cancelReview(): void {
    this.reviewVersion++;
    if (this.reviewTimer) clearTimeout(this.reviewTimer);
    this.reviewTimer = null;
    this.review = null;
    this.error = '';
  }

  public async confirmReview(): Promise<void> {
    const review = this.review;
    if (!review || this.adding) return;
    this.error = '';
    this.adding = true;
    try {
      const name = review.name.trim();
      if (!name) throw new Error('Enter a product name.');
      if (!Number.isInteger(review.count) || review.count! < 1 || review.count! > 999) {
        throw new Error('Enter a whole number from 1 to 999.');
      }
      let product = review.productId ? await this.catalog.byId(review.productId) : this.findProductByName(name);
      if (!product) {
        const newCategory = review.newCategoryName.trim();
        let category: CatalogNode | undefined;
        if (newCategory) category = await this.catalog.findOrCreateClass(newCategory);
        else category = this.foodClasses.find(node => node.id === review.categoryId);
        if (!category) throw new Error('Choose or create a food category.');
        product = {
          id: uuidv4(), parentId: category.id, kind: 'product', name, brand: null, barcodes: [],
          saleKind: 'fixed', packageAmount: 1, packageUnit: 'piece', variableUnit: null, rawPackage: null
        };
        await this.catalog.save(product);
        review.productId = product.id;
      }
      if (product.saleKind === 'variable' && !(Number(review.bulkAmount) > 0)) {
        throw new Error(`Enter the amount in ${product.variableUnit} for this weight-based product.`);
      }
      await this.stock.receive(product.id, {
        packages: product.saleKind === 'variable' ? 1 : review.count!,
        bulkQuantity: product.saleKind === 'variable' ?
          {amount: Number(review.bulkAmount), unit: product.variableUnit as BaseUnit} : undefined,
        expiryDate: null, scanId: review.stockId
      });
      this.success = `${review.count} ${product.name} added to fridge.`;
      this.quickName = '';
      this.cancelReview();
      this.quickInput?.nativeElement.focus();
    } catch (error) {
      this.error = String(error instanceof Error ? error.message : error);
    } finally {
      this.adding = false;
      this.cdr.markForCheck();
    }
  }

  public openMenu(): void {
    void this.menu.open('main-menu');
  }

  public openCatalog(): void {
    void this.router.navigate(['/tabs/items']);
  }

  public openScanner(): void {
    void this.router.navigate(['/tabs/todo/scan'], {queryParams: {from: 'fridge'}});
  }

  public get products(): CatalogNode[] {
    return this.nodes.filter(node => node.kind === 'product');
  }

  public get suggestions(): CatalogNode[] {
    const query = this.quickName.trim().toLocaleLowerCase();
    if (!query || !this.suggestionsOpen) return [];
    return this.nodes.filter(node => node.parentId !== null &&
      `${node.name} ${node.brand ?? ''}`.toLocaleLowerCase().includes(query))
      .sort((a, b) => Number(b.name.toLocaleLowerCase() === query) - Number(a.name.toLocaleLowerCase() === query) ||
        Number(a.kind === 'product') - Number(b.kind === 'product') || a.name.localeCompare(b.name))
      .slice(0, 5);
  }

  public get selectedProduct(): CatalogNode | null {
    return this.products.find(node => node.id === this.productId) ?? null;
  }

  public productName(id: string): string {
    return this.nodes.find(node => node.id === id)?.name ?? 'Unknown product';
  }

  public productSubtitle(id: string): string {
    const product = this.nodes.find(node => node.id === id);
    return product?.brand ?? '';
  }

  public formatLot(lot: StockLot): string {
    return formatQuantity({amount: lot.remainingAmount, unit: lot.acquiredUnit});
  }

  public lotAmount(lot: StockLot): number {
    return Number(lot.remainingAmount.toFixed(3));
  }

  public lotUnit(lot: StockLot): string {
    return lot.acquiredUnit === 'package' ? 'pkg' : lot.acquiredUnit;
  }

  public expiryStatus(lot: StockLot): 'expired' | 'soon' | 'fresh' {
    if (!lot.expiryDate) return 'fresh';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(`${lot.expiryDate}T00:00:00`);
    const days = Math.floor((expiry.getTime() - today.getTime()) / 86400000);
    return days < 0 ? 'expired' : days <= 3 ? 'soon' : 'fresh';
  }

  public inputChanged(value: string): void {
    this.quickName = value;
    this.productId = '';
    this.suggestionsOpen = true;
    this.error = '';
    this.success = '';
  }

  public chooseSuggestion(node: CatalogNode): void {
    this.quickName = node.name;
    this.productId = node.kind === 'product' ? node.id : '';
    this.suggestionsOpen = false;
    void this.prepareReview(node.name, node);
  }

  public toggleDetails(): void {
    this.detailsOpen = !this.detailsOpen;
    this.suggestionsOpen = this.detailsOpen && !!this.quickName.trim();
    if (!this.quickName.trim()) this.quickInput?.nativeElement.focus();
  }

  public edit(lot: StockLot): void {
    this.editing = lot;
    this.remainingAmount = lot.remainingAmount;
    this.expiryDate = lot.expiryDate ?? '';
  }

  public cancelEdit(): void {
    this.editing = null;
    this.expiryDate = '';
  }

  public async remove(lot: StockLot): Promise<void> {
    await this.stock.remove(lot.id);
  }

  public async saveEdit(): Promise<void> {
    this.error = '';
    try {
      if (!this.editing) return;
      await this.stock.save({
        ...this.editing,
        remainingAmount: Number(this.remainingAmount),
        expiryDate: this.expiryDate || null
      });
      this.cancelEdit();
    } catch (error) {
      this.error = String(error instanceof Error ? error.message : error);
    } finally {
      this.cdr.detectChanges();
    }
  }

  private async resolveProduct(node?: CatalogNode): Promise<CatalogNode> {
    if (node?.kind === 'product') return node;
    if (this.selectedProduct) return this.selectedProduct;
    const name = this.quickName.trim();
    if (!name) throw new Error('Enter a product name.');
    const normalized = name.toLocaleLowerCase();
    const selectedClass = node?.kind === 'class' ? node : this.nodes.find(candidate =>
      candidate.kind === 'class' && candidate.parentId !== null && candidate.name.toLocaleLowerCase() === normalized);
    const product = !selectedClass ? this.products.find(candidate => candidate.name.toLocaleLowerCase() === normalized) : null;
    if (product) return product;
    const parent = selectedClass ?? await this.catalog.findOrCreateClass(name);
    const generic = this.products.find(candidate => candidate.parentId === parent.id && !candidate.brand &&
      !candidate.barcodes.length && candidate.saleKind === 'unknown' && candidate.name.toLocaleLowerCase() === normalized);
    if (generic) return generic;
    const draft: CatalogNode = {
      id: uuidv4(), parentId: parent.id, kind: 'product', name: parent.name,
      brand: null, barcodes: [], saleKind: 'unknown', packageAmount: null, packageUnit: null,
      variableUnit: null, rawPackage: null
    };
    await this.catalog.save(draft);
    return draft;
  }

  public async addQuick(node?: CatalogNode): Promise<void> {
    if (this.adding) return;
    this.error = '';
    this.adding = true;
    try {
      const product = await this.resolveProduct(node);
      if (product.saleKind === 'variable' && !this.detailsOpen) {
        this.detailsOpen = true;
        return;
      }
      const bulkQuantity = product.saleKind === 'variable'
        ? {amount: Number(this.bulkAmount), unit: product.variableUnit as BaseUnit} : undefined;
      await this.stock.receive(product.id, {
        packages: this.detailsOpen ? Number(this.packages) : 1,
        bulkQuantity, expiryDate: this.detailsOpen ? this.expiryDate || null : null
      });
      this.quickName = '';
      this.productId = '';
      this.packages = 1;
      this.bulkAmount = 1;
      this.expiryDate = '';
      this.suggestionsOpen = false;
      this.quickInput?.nativeElement.focus();
    } catch (error) {
      this.error = String(error instanceof Error ? error.message : error);
    } finally {
      this.adding = false;
      this.cdr.detectChanges();
    }
  }
}
