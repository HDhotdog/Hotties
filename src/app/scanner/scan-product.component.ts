import {CommonModule} from '@angular/common';
import {ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnDestroy, OnInit} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {Capacitor} from '@capacitor/core';
import {
  CapacitorBarcodeScanner,
  CapacitorBarcodeScannerCameraDirection,
  CapacitorBarcodeScannerTypeHintALLOption
} from '@capacitor/barcode-scanner';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonSpinner,
  IonTitle,
  IonToolbar
} from '@ionic/angular';
import {firstValueFrom, Subscription, take} from 'rxjs';
import {CatalogService} from '../domain/catalog.service';
import {CatalogNode, catalogPath, SaleKind, sortCatalogCategoriesByPath} from '../domain/catalog.model';
import {StockService} from '../domain/stock.service';
import {BaseQuantity, BaseUnit, parsePackageQuantity} from '../domain/quantity';
import {CategoryService} from '../category/category.service';
import {Category} from '../category/category.dto';
import {FoodProduct, ProductLookupError} from './open-food-facts.service';
import {OffProductCacheService} from './off-product-cache.service';
import {InternalProductMapService} from './internal-product-map.service';
import {decodeWeightedBarcode, isInternalBarcode, WeightedBarcode} from './internal-barcode';
import {v4 as uuidv4} from 'uuid';

type ScanState = 'idle' | 'scanning' | 'looking-up' | 'saving';
type BarcodeOutcome = 'added' | 'pending' | 'stopped';

@Component({
  selector: 'app-scan-product', standalone: true, templateUrl: './scan-product.component.html',
  styleUrls: ['./scan-product.component.scss'], changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonInput, IonSpinner, IonTitle, IonToolbar]
})
export class ScanProductComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly lookup = inject(OffProductCacheService);
  private readonly internalMap = inject(InternalProductMapService);
  private readonly catalog = inject(CatalogService);
  private readonly stock = inject(StockService);
  private readonly categories = inject(CategoryService);
  private subscription?: Subscription;
  public nodes: CatalogNode[] = [];
  public barcodeInput = '';
  public state: ScanState = 'idle';
  public errorMessage: string | null = null;
  public savedName: string | null = null;
  public readonly nativeScanner = Capacitor.isNativePlatform();
  public pendingProduct: FoodProduct | null = null;
  public pendingRefresh: { saved: CatalogNode; fresh: FoodProduct } | null = null;
  public pendingInternal: WeightedBarcode | null = null;
  public stores: Category[] = [];
  public selectedStoreId = '';
  public mappedProduct: CatalogNode | null = null;
  public mappingMode = false;
  public selectedInternalProductId = '';
  public internalName = '';
  public internalClassId = '';
  public infoMessage: string | null = null;
  public retryAvailable = false;
  public selectedClassId = '';
  public newClassName = '';
  public saleKind: SaleKind = 'unknown';
  public packageAmount = 1;
  public packageUnit: BaseUnit = 'piece';
  public detailsOpen = false;
  private activeScanId: string | null = null;
  private activeBarcode = '';
  private cameraSession = false;
  private cameraSessionId = 0;
  private viewActive = true;
  public readonly units: BaseUnit[] = ['g', 'ml', 'piece', 'bunch'];

  public ngOnInit(): void {
    this.subscription = this.catalog.observe().subscribe(nodes => {
      this.nodes = nodes;
      this.cdr.markForCheck();
    });
  }

  public ngOnDestroy(): void {
    this.ionViewWillLeave();
    this.subscription?.unsubscribe();
  }

  public get classes(): CatalogNode[] {
    return sortCatalogCategoriesByPath(
      this.nodes.filter(node => node.kind === 'class' && node.parentId !== null), this.nodes);
  }

  public categoryPath(category: CatalogNode): string {
    return catalogPath(category, this.nodes);
  }

  public get gramProducts(): CatalogNode[] {
    return this.nodes.filter(node => node.kind === 'product' && node.saleKind === 'variable' && node.variableUnit === 'g');
  }

  public get selectedStoreName(): string {
    return this.stores.find(store => store.id === this.selectedStoreId)?.name ?? '';
  }

  public get categoryName(): string {
    return this.classes.find(node => node.id === this.selectedClassId)?.name ??
      (this.newClassName.trim() || this.pendingProduct?.name || '');
  }

  public ionViewDidEnter(): void {
    this.viewActive = true;
    if (this.nativeScanner && !this.pendingProduct && !this.pendingInternal &&
      !this.pendingRefresh && this.state === 'idle') void this.scan();
  }

  public ionViewWillLeave(): void {
    this.viewActive = false;
    this.endCameraSession();
  }

  public async scan(): Promise<void> {
    if (!this.viewActive || this.state !== 'idle' || this.pendingProduct || this.pendingInternal || this.pendingRefresh) return;
    this.cameraSession = true;
    const sessionId = this.cameraSessionId;
    this.setState('scanning');
    this.errorMessage = null;
    let outcome: BarcodeOutcome = 'stopped';
    try {
      const result = await CapacitorBarcodeScanner.scanBarcode({
        hint: CapacitorBarcodeScannerTypeHintALLOption.ALL,
        cameraDirection: CapacitorBarcodeScannerCameraDirection.BACK,
        scanInstructions: 'Point the camera at a product barcode',
        cancelButtonAccessibilityLabel: 'Cancel barcode scan',
        torchButtonOnAccessibilityLabel: 'Turn flashlight off',
        torchButtonOffAccessibilityLabel: 'Turn flashlight on'
      });
      if (this.cameraSession && sessionId === this.cameraSessionId && result.ScanResult) {
        this.barcodeInput = result.ScanResult;
        outcome = await this.addBarcode(result.ScanResult);
      }
    } catch (error) {
      if (!String(error).toLowerCase().includes('cancel')) this.errorMessage = 'Could not open the camera. Enter the barcode below.';
    } finally {
      this.setState('idle');
      if (outcome === 'added') this.queueNextScan(sessionId);
      else if (outcome === 'stopped') this.endCameraSession();
    }
  }

  public async addBarcode(value: string, retry = false): Promise<BarcodeOutcome> {
    if (this.state !== 'idle' && this.state !== 'scanning') return 'stopped';
    const barcode = value.trim();
    if (!isInternalBarcode(barcode) && !/^\d{8,14}$/.test(barcode)) {
      this.errorMessage = 'Enter a valid 8–14 digit barcode.';
      this.setState('idle');
      return 'stopped';
    }
    if (barcode !== this.activeBarcode || !this.activeScanId) {
      this.activeBarcode = barcode;
      this.activeScanId = uuidv4();
    }
    this.errorMessage = null;
    this.infoMessage = null;
    this.retryAvailable = false;
    this.savedName = null;
    this.setState('looking-up');
    try {
      if (isInternalBarcode(barcode)) {
        if (!barcode.startsWith('29')) throw new Error('This internal barcode format is not supported yet.');
        await this.startInternal(decodeWeightedBarcode(barcode));
        return 'pending';
      }
      const existing = await this.catalog.byBarcode(barcode);
      if (existing) {
        const cached = await this.lookup.getEntry(barcode);
        if (cached?.status === 'found' && !this.lookup.isFresh(cached)) {
          try {
            await this.lookup.lookup(barcode);
          } catch {
            this.infoMessage = 'Using saved product details. Open Food Facts can be checked on a later scan.';
            await this.receive(existing);
            return 'stopped';
          }
        }
        const latest = await this.lookup.getEntry(barcode);
        if (latest?.status === 'found' && latest.product && this.lookup.isFresh(latest) &&
          latest.reviewedAt !== latest.fetchedAt && this.detailsDiffer(existing, latest.product)) {
          this.pendingRefresh = {saved: existing, fresh: latest.product};
          return 'pending';
        }
        await this.receive(existing);
        return 'added';
      }
      const found = await this.lookup.lookup(barcode, retry);
      this.pendingProduct = found;
      this.detailsOpen = false;
      this.selectedClassId = this.catalog.suggestedClass(found.name, this.nodes)?.id ?? '';
      const parsed = parsePackageQuantity(found.packageQuantity);
      this.saleKind = parsed ? 'fixed' : 'unknown';
      this.packageAmount = parsed?.amount ?? 1;
      this.packageUnit = parsed?.unit ?? 'piece';
      return 'pending';
    } catch (error) {
      this.errorMessage = error instanceof ProductLookupError ? error.message : 'Could not process this product. Try again.';
      if (error instanceof ProductLookupError) this.retryAvailable = error.code === 'not-found';
      if (isInternalBarcode(barcode) && error instanceof Error) this.errorMessage = error.message;
      return 'stopped';
    } finally {
      this.setState('idle');
    }
  }

  private detailsDiffer(saved: CatalogNode, fresh: FoodProduct): boolean {
    return saved.name !== fresh.name || saved.brand !== fresh.brand || saved.rawPackage !== fresh.packageQuantity;
  }

  public async confirmRefresh(useFresh: boolean): Promise<void> {
    if (!this.pendingRefresh || this.state !== 'idle') return;
    const sessionId = this.cameraSessionId;
    let added = false;
    this.errorMessage = null;
    this.setState('saving');
    try {
      const {saved, fresh} = this.pendingRefresh;
      let product = saved;
      if (useFresh) {
        const parsed = parsePackageQuantity(fresh.packageQuantity);
        product = {
          ...saved, name: fresh.name, brand: fresh.brand, rawPackage: fresh.packageQuantity,
          saleKind: parsed ? 'fixed' : 'unknown', packageAmount: parsed?.amount ?? null,
          packageUnit: parsed?.unit ?? null, variableUnit: null
        };
        await this.catalog.save(product);
      } else {
        await this.lookup.markReviewed(fresh.barcode);
      }
      await this.receive(product);
      this.pendingRefresh = null;
      added = true;
    } catch (error) {
      this.errorMessage = String(error instanceof Error ? error.message : error);
      this.endCameraSession();
    } finally {
      this.setState('idle');
      if (added) this.queueNextScan(sessionId);
    }
  }

  private async startInternal(decoded: WeightedBarcode): Promise<void> {
    this.pendingInternal = decoded;
    this.stores = await firstValueFrom(this.categories.getCategories().pipe(take(1)));
    const selected = await firstValueFrom(this.categories.getSelectedCategoryId().pipe(take(1)));
    this.selectedStoreId = this.route.snapshot.queryParamMap.get('from') === 'fridge' ? '' :
      this.stores.some(store => store.id === selected) ? selected ?? '' : '';
    this.mappedProduct = null;
    this.mappingMode = false;
    this.selectedInternalProductId = '';
    this.internalName = '';
    this.internalClassId = '';
    if (this.selectedStoreId) await this.selectInternalStore();
  }

  public async selectInternalStore(): Promise<void> {
    if (!this.pendingInternal || !this.selectedStoreId) return;
    this.errorMessage = null;
    this.setState('looking-up');
    try {
      this.mappedProduct = await this.internalMap.get(this.selectedStoreId, this.pendingInternal.productCode);
      this.mappingMode = !this.mappedProduct;
    } catch (error) {
      this.errorMessage = String(error instanceof Error ? error.message : error);
      this.endCameraSession();
    } finally {
      this.setState('idle');
    }
  }

  public changeInternalProduct(): void {
    this.mappingMode = true;
    this.selectedInternalProductId = this.mappedProduct?.id ?? '';
    this.cdr.markForCheck();
  }

  public async confirmInternal(): Promise<void> {
    if (!this.pendingInternal || !this.selectedStoreId || this.state !== 'idle') return;
    const sessionId = this.cameraSessionId;
    let added = false;
    this.errorMessage = null;
    this.setState('saving');
    try {
      let product = this.mappedProduct;
      if (this.mappingMode) {
        if (this.selectedInternalProductId) {
          product = await this.catalog.byId(this.selectedInternalProductId);
        } else {
          const name = this.internalName.trim();
          if (!name) throw new Error('Enter the product name.');
          const classId = this.internalClassId || (await this.catalog.findOrCreateClass(name)).id;
          product = this.catalog.createLooseDraft(name, classId, 'g');
          await this.catalog.save(product);
        }
        await this.internalMap.save(this.selectedStoreId, this.pendingInternal.productCode, product.id);
      }
      if (!product) throw new Error('Choose a product sold by the gram.');
      await this.receive(product, {amount: this.pendingInternal.grams, unit: 'g'}, this.selectedStoreId);
      this.pendingInternal = null;
      this.mappedProduct = null;
      this.mappingMode = false;
      added = true;
    } catch (error) {
      this.errorMessage = String(error instanceof Error ? error.message : error);
      this.endCameraSession();
    } finally {
      this.setState('idle');
      if (added) this.queueNextScan(sessionId);
    }
  }

  public clearPending(): void {
    this.endCameraSession();
    this.pendingInternal = null;
    this.pendingRefresh = null;
    this.pendingProduct = null;
    this.mappingMode = false;
    this.activeScanId = null;
    this.activeBarcode = '';
    this.barcodeInput = '';
    this.errorMessage = null;
    this.cdr.markForCheck();
  }

  public async confirmProduct(): Promise<void> {
    if (!this.pendingProduct || this.state !== 'idle') return;
    const sessionId = this.cameraSessionId;
    let added = false;
    this.errorMessage = null;
    this.setState('saving');
    try {
      const classId = this.selectedClassId || (await this.catalog.findOrCreateClass(
        this.newClassName.trim() || this.pendingProduct.name)).id;
      const content = this.saleKind === 'fixed' ? {amount: Number(this.packageAmount), unit: this.packageUnit} : null;
      const existing = await this.catalog.byBarcode(this.pendingProduct.barcode);
      const product = existing ?? this.catalog.productDraft(this.pendingProduct, classId, content);
      if (!existing) await this.catalog.save(product);
      await this.receive(product);
      this.pendingProduct = null;
      this.newClassName = '';
      this.selectedClassId = '';
      this.detailsOpen = false;
      added = true;
    } catch (error) {
      this.errorMessage = String(error instanceof Error ? error.message : error);
      this.endCameraSession();
    } finally {
      this.setState('idle');
      if (added) this.queueNextScan(sessionId);
    }
  }

  private async receive(product: CatalogNode, bulkQuantity?: BaseQuantity, storeId?: string): Promise<void> {
    this.setState('saving');
    const listId = storeId ?? await firstValueFrom(this.categories.getSelectedCategoryId().pipe(take(1)));
    await this.stock.receive(product.id, {
      shoppingListId: listId ?? undefined, scanId: this.activeScanId ?? uuidv4(), bulkQuantity
    });
    this.savedName = bulkQuantity ? `${bulkQuantity.amount} g ${product.name}` : product.name;
    this.barcodeInput = '';
    this.activeScanId = null;
    this.activeBarcode = '';
  }

  public get backLabel(): string {
    return this.route.snapshot.queryParamMap.get('from') === 'fridge' ? 'Back to fridge' : 'Back to shopping list';
  }

  public backToShopping(): void {
    this.endCameraSession();
    void this.router.navigate([this.route.snapshot.queryParamMap.get('from') === 'fridge' ? '/tabs/fridge' : '/tabs/todo']);
  }

  public viewFridge(): void {
    this.endCameraSession();
    void this.router.navigate(['/tabs/fridge']);
  }

  public addManually(): void {
    this.endCameraSession();
    void this.router.navigate(['/tabs/items']);
  }

  private queueNextScan(sessionId: number): void {
    queueMicrotask(() => {
      if (this.viewActive && this.cameraSession && sessionId === this.cameraSessionId &&
        this.state === 'idle' && !this.pendingProduct && !this.pendingInternal && !this.pendingRefresh) {
        void this.scan();
      }
    });
  }

  private endCameraSession(): void {
    this.cameraSession = false;
    this.cameraSessionId++;
  }

  private setState(state: ScanState): void {
    this.state = state;
    this.cdr.markForCheck();
  }
}
