import {LocalizedNumberDirective} from '../i18n/localized-number.directive';
import {LocalizedDateComponent} from '../i18n/localized-date.component';
import {AppError, Message, message} from '../i18n/language-pack';
import {LocalizationService} from '../i18n/localization.service';
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
import {CatalogNode, catalogPath, sortCatalogCategoriesByPath} from './catalog.model';
import {StockService} from './stock.service';
import {StockLot} from './shopping.model';
import {BaseUnit} from './quantity';
import {parseStockInput} from './stock-input';
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
  modelUnavailable: boolean;
}

interface StockCategoryGroup {
  id: string;
  path: string;
  lots: StockLot[];
}

type ExpiryStatus = 'expired' | 'soon' | 'fine' | 'none';

const EXPIRY_WARNING_DAYS = 3;
const EXPANDED_CATEGORIES_KEY = 'fridge-expanded-category-ids-v1';
const UNKNOWN_CATEGORY_ID = 'unknown-category';

@Component({
  selector: 'app-stock-page', standalone: true,
  imports: [LocalizedNumberDirective, LocalizedDateComponent, CommonModule, FormsModule, IonButton, IonButtons, IonContent, IonFooter, IonHeader, IonIcon, IonTitle, IonToolbar],
  templateUrl: './stock-page.component.html',
  styleUrls: ['./stock-page.component.scss']
})
export class StockPageComponent implements OnInit, OnDestroy {
  public readonly i18n = inject(LocalizationService);
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
  public expandedCategoryIds = new Set<string>();
  public productId = '';
  public packages = 1;
  public bulkAmount = 1;
  public remainingAmount = 0;
  public expiryDate = '';
  public editing: StockLot | null = null;
  public error: Message = '';
  public quickName = '';
  public detailsOpen = false;
  public suggestionsOpen = false;
  public adding = false;
  public review: StockReview | null = null;
  public voiceSupported = false;
  public listening = false;
  public success: Message = '';
  private voiceGeneration = 0;
  private reviewVersion = 0;
  private reviewTimer: ReturnType<typeof setTimeout> | null = null;

  public ngOnInit(): void {
    this.restoreExpandedCategories();
    this.subscriptions.add(this.i18n.languageChanged.subscribe(() => {void this.refreshVoiceSupport();}));
    void this.refreshVoiceSupport();
    this.subscriptions.add(this.catalog.observe().subscribe(nodes => {
      this.nodes = nodes;
      this.cdr.detectChanges();
    }));
    this.subscriptions.add(this.stock.observe().subscribe(lots => {
      this.lots = lots;
      if (this.editing && !lots.some(lot => lot.id === this.editing?.id)) this.cancelEdit();
      this.cdr.detectChanges();
    }));
  }

  public ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.voiceGeneration++;
    if (this.listening) void OfflineSpeech.cancel();
    this.reviewVersion++;
    if (this.reviewTimer) clearTimeout(this.reviewTimer);
  }

  public get foodClasses(): CatalogNode[] {
    return sortCatalogCategoriesByPath(this.nodes.filter(node => node.kind === 'class' && node.parentId !== null &&
      this.catalog.matches('root-food', node.id, this.nodes)), this.nodes, this.i18n.locale(), node => this.i18n.name(node));
  }

  public categoryPath(category: CatalogNode): string {
    return catalogPath(category, this.nodes, node => this.i18n.name(node));
  }

  public get stockCategories(): StockCategoryGroup[] {
    const byId = new Map(this.nodes.map(node => [node.id, node]));
    const grouped = new Map<string, StockLot[]>();
    for (const lot of this.lots) {
      const product = byId.get(lot.productId);
      const parent = product?.parentId ? byId.get(product.parentId) : undefined;
      const categoryId = parent?.kind === 'class' ? parent.id : UNKNOWN_CATEGORY_ID;
      const categoryLots = grouped.get(categoryId) ?? [];
      categoryLots.push(lot);
      grouped.set(categoryId, categoryLots);
    }
    const categories = sortCatalogCategoriesByPath(
      [...grouped.keys()].map(id => byId.get(id)).filter((node): node is CatalogNode => !!node), this.nodes, this.i18n.locale(), node => this.i18n.name(node));
    const result = categories.map(category => ({
      id: category.id,
      path: catalogPath(category, this.nodes, node => this.i18n.name(node)),
      lots: this.sortCategoryLots(grouped.get(category.id)!, byId)
    }));
    if (grouped.has(UNKNOWN_CATEGORY_ID)) {
      result.push({id: UNKNOWN_CATEGORY_ID, path: this.i18n.t('stock.unknownCategory'),
        lots: this.sortCategoryLots(grouped.get(UNKNOWN_CATEGORY_ID)!, byId)});
    }
    return result;
  }

  public isCategoryExpanded(id: string): boolean {
    return this.expandedCategoryIds.has(id);
  }

  public toggleCategory(id: string): void {
    if (this.expandedCategoryIds.has(id)) {
      this.expandedCategoryIds.delete(id);
      if (this.editing && this.stockCategories.some(category => category.id === id &&
        category.lots.some(lot => lot.id === this.editing?.id))) this.cancelEdit();
    } else this.expandedCategoryIds.add(id);
    try {
      localStorage.setItem(EXPANDED_CATEGORIES_KEY, JSON.stringify([...this.expandedCategoryIds]));
    } catch {
      // Keep the current view usable when device storage is unavailable.
    }
  }

  private restoreExpandedCategories(): void {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(EXPANDED_CATEGORIES_KEY) ?? '[]');
      if (Array.isArray(saved)) this.expandedCategoryIds = new Set(saved.filter((id): id is string => typeof id === 'string'));
    } catch {
      this.expandedCategoryIds = new Set();
    }
  }

  private sortCategoryLots(lots: StockLot[], byId: Map<string, CatalogNode>): StockLot[] {
    return [...lots].sort((left, right) => {
      const leftProduct = byId.get(left.productId);
      const rightProduct = byId.get(right.productId);
      return this.i18n.compare(leftProduct?.name ?? '', rightProduct?.name ?? '') ||
        (leftProduct?.name ?? '').localeCompare(rightProduct?.name ?? '', this.i18n.locale()) ||
        this.i18n.compare(leftProduct?.brand ?? '', rightProduct?.brand ?? '') ||
        left.productId.localeCompare(right.productId) ||
        (left.expiryDate ?? '9999-12-31').localeCompare(right.expiryDate ?? '9999-12-31') ||
        left.createdAt - right.createdAt || left.id.localeCompare(right.id);
    });
  }

  public get reviewProduct(): CatalogNode | null {
    return this.products.find(node => node.id === this.review?.productId) ?? null;
  }

  public get reviewSuggestions(): CatalogNode[] {
    return (this.review?.suggestedIds ?? []).map(id => this.nodes.find(node => node.id === id))
      .filter((node): node is CatalogNode => !!node);
  }

  private async refreshVoiceSupport(): Promise<void> {
    const generation = ++this.voiceGeneration;
    this.voiceSupported = false;
    if (this.listening) {
      this.listening = false;
      await OfflineSpeech.cancel().catch(error => console.error('Could not cancel speech.', error));
    }
    try {
      const available = await OfflineSpeech.available(this.i18n.locale());
      if (generation === this.voiceGeneration) this.voiceSupported = available;
    } catch {if (generation === this.voiceGeneration) this.voiceSupported = false;}
    if (generation === this.voiceGeneration) this.cdr.markForCheck();
  }

  public async startVoice(): Promise<void> {
    if (!this.voiceSupported || this.listening || this.adding) return;
    const generation = this.voiceGeneration;
    this.error = '';
    this.success = '';
    this.listening = true;
    this.cdr.markForCheck();
    try {
      const language = this.i18n.language();
      const text = await OfflineSpeech.listen(this.i18n.locale());
      if (generation === this.voiceGeneration && language === this.i18n.language()) await this.prepareReview(text);
    } catch (error) {
      if (generation === this.voiceGeneration) this.error = this.i18n.error(error);
    } finally {
      if (generation === this.voiceGeneration) {this.listening = false; this.cdr.markForCheck();}
    }
  }

  public async prepareReview(raw: string, selectedNode?: CatalogNode): Promise<void> {
    const parsed = parseStockInput(raw, this.i18n.pack());
    this.error = '';
    this.success = '';
    if (!parsed.name) {
      this.error = 'ui.enterOrSayAProductName';
      return;
    }
    this.review = {
      stockId: uuidv4(),
      name: parsed.name, count: parsed.count,
      productId: selectedNode?.kind === 'product' ? selectedNode.id : '',
      categoryId: selectedNode?.kind === 'class' ? selectedNode.id : '',
      newCategoryName: '', bulkAmount: null, suggestedIds: [], ranking: false, categoryError: false,
      modelUnavailable: false
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
    const normalized = name.trim().toLocaleLowerCase(this.i18n.locale());
    const exact = this.products.find(node => node.name.toLocaleLowerCase(this.i18n.locale()) === normalized);
    if (exact) return exact;
    // Try only pack-provided variants against existing products; never rewrite new names.
    for (const {suffix, replacement} of this.i18n.pack().input.nameSuffixes) {
      if (!normalized.endsWith(suffix)) continue;
      const candidate = normalized.slice(0, -suffix.length) + replacement;
      const product = this.products.find(node => node.name.toLocaleLowerCase(this.i18n.locale()) === candidate);
      if (product) return product;
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
      review.modelUnavailable = false;
      this.cdr.markForCheck();
      return;
    }
    review.productId = '';
    review.suggestedIds = [];
    review.ranking = false;
    review.categoryError = false;
    review.modelUnavailable = false;
    this.cdr.markForCheck();
    if (!this.foodClasses.length) return;
    try {
      const availability = await this.categorySuggestions.availability();
      if (this.review !== review || version !== this.reviewVersion) return;
      if (!availability.ready) {
        review.modelUnavailable = availability.enabled;
        return;
      }
      review.ranking = true;
      this.cdr.markForCheck();
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
      if (!name) throw new AppError('ui.enterAProductName', "Enter a product name.");
      if (!Number.isInteger(review.count) || review.count! < 1 || review.count! > 999) {
        throw new AppError('ui.enterAWholeNumberFrom1To999', "Enter a whole number from 1 to 999.");
      }
      let product = review.productId ? await this.catalog.byId(review.productId) : this.findProductByName(name);
      if (!product) {
        const newCategory = review.newCategoryName.trim();
        let category: CatalogNode | undefined;
        if (newCategory) category = await this.catalog.findOrCreateClass(newCategory);
        else category = this.foodClasses.find(node => node.id === review.categoryId);
        if (!category) throw new AppError('ui.chooseOrCreateAFoodCategory', "Choose or create a food category.");
        product = {
          id: uuidv4(), parentId: category.id, kind: 'product', name, brand: null, barcodes: [],
          saleKind: 'fixed', packageAmount: 1, packageUnit: 'piece', variableUnit: null, rawPackage: null,
          unitConversions: {}
        };
        await this.catalog.save(product);
        review.productId = product.id;
      }
      if (product.saleKind === 'variable' && !(Number(review.bulkAmount) > 0)) {
        throw new AppError('stock.enterMeasuredAmount', 'Enter the measured quantity.', {unit: this.i18n.unit(product.variableUnit)});
      }
      await this.stock.receive(product.id, {
        packages: product.saleKind === 'variable' ? 1 : review.count!,
        bulkQuantity: product.saleKind === 'variable' ?
          {amount: Number(review.bulkAmount), unit: product.variableUnit as BaseUnit} : undefined,
        expiryDate: null, scanId: review.stockId
      });
      this.success = message('stock.added', {count: review.count!, name: product.name});
      this.quickName = '';
      this.cancelReview();
      this.quickInput?.nativeElement.focus();
    } catch (error) {
      this.error = this.i18n.error(error);
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
    void this.router.navigate(['/tabs/shopping/scan'], {queryParams: {from: 'fridge'}});
  }

  public get products(): CatalogNode[] {
    return this.nodes.filter(node => node.kind === 'product');
  }

  public get suggestions(): CatalogNode[] {
    const query = this.quickName.trim().toLocaleLowerCase(this.i18n.locale());
    if (!query || !this.suggestionsOpen) return [];
    return this.nodes.filter(node => node.parentId !== null &&
      `${this.i18n.name(node)} ${node.brand ?? ''}`.toLocaleLowerCase(this.i18n.locale()).includes(query))
      .sort((a, b) => Number(b.name.toLocaleLowerCase(this.i18n.locale()) === query) - Number(a.name.toLocaleLowerCase(this.i18n.locale()) === query) ||
        Number(a.kind === 'product') - Number(b.kind === 'product') || this.i18n.compare(this.i18n.name(a), this.i18n.name(b)))
      .slice(0, 5);
  }

  public get selectedProduct(): CatalogNode | null {
    return this.products.find(node => node.id === this.productId) ?? null;
  }

  public productName(id: string): string {
    return this.nodes.find(node => node.id === id)?.name ?? this.i18n.t('ui.unknownProduct');
  }

  public productSubtitle(id: string): string {
    const product = this.nodes.find(node => node.id === id);
    return product?.brand ?? '';
  }

  public formatLot(lot: StockLot): string {
    return this.i18n.quantity(lot.remainingAmount, lot.acquiredUnit);
  }

  public lotAmount(lot: StockLot): number {
    return Number(lot.remainingAmount.toFixed(3));
  }

  public lotUnit(lot: StockLot): string {
    return this.i18n.unit(lot.acquiredUnit, lot.remainingAmount);
  }

  public expiryStatus(lot: StockLot): ExpiryStatus {
    if (!lot.expiryDate) return 'none';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(`${lot.expiryDate}T00:00:00`);
    const days = Math.round((expiry.getTime() - today.getTime()) / 86400000);
    return days < 0 ? 'expired' : days <= EXPIRY_WARNING_DAYS ? 'soon' : 'fine';
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
      this.error = this.i18n.error(error);
    } finally {
      this.cdr.detectChanges();
    }
  }

  private async resolveProduct(node?: CatalogNode): Promise<CatalogNode> {
    if (node?.kind === 'product') return node;
    if (this.selectedProduct) return this.selectedProduct;
    const name = this.quickName.trim();
    if (!name) throw new AppError('ui.enterAProductName', "Enter a product name.");
    const normalized = name.toLocaleLowerCase(this.i18n.locale());
    const selectedClass = node?.kind === 'class' ? node : this.nodes.find(candidate =>
      candidate.kind === 'class' && candidate.parentId !== null && candidate.name.toLocaleLowerCase(this.i18n.locale()) === normalized);
    const product = !selectedClass ? this.products.find(candidate => candidate.name.toLocaleLowerCase(this.i18n.locale()) === normalized) : null;
    if (product) return product;
    const parent = selectedClass ?? await this.catalog.findOrCreateClass(name);
    const generic = this.products.find(candidate => candidate.parentId === parent.id && !candidate.brand &&
      !candidate.barcodes.length && candidate.saleKind === 'unknown' && candidate.name.toLocaleLowerCase(this.i18n.locale()) === normalized);
    if (generic) return generic;
    const draft: CatalogNode = {
      id: uuidv4(), parentId: parent.id, kind: 'product', name: parent.name,
      brand: null, barcodes: [], saleKind: 'unknown', packageAmount: null, packageUnit: null,
      variableUnit: null, rawPackage: null, unitConversions: {}
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
      this.error = this.i18n.error(error);
    } finally {
      this.adding = false;
      this.cdr.detectChanges();
    }
  }
}
