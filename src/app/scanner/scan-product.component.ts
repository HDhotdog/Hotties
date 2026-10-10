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
import {CatalogNode, SaleKind} from '../domain/catalog.model';
import {StockService} from '../domain/stock.service';
import {BaseUnit, parsePackageQuantity} from '../domain/quantity';
import {CategoryService} from '../category/category.service';
import {FoodProduct, OpenFoodFactsService, ProductLookupError} from './open-food-facts.service';
import {v4 as uuidv4} from 'uuid';

type ScanState = 'idle' | 'scanning' | 'looking-up' | 'saving';

@Component({
  selector: 'app-scan-product', standalone: true, templateUrl: './scan-product.component.html',
  styleUrls: ['./scan-product.component.scss'], changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonInput, IonSpinner, IonTitle, IonToolbar]
})
export class ScanProductComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly lookup = inject(OpenFoodFactsService);
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
  public selectedClassId = '';
  public newClassName = '';
  public saleKind: SaleKind = 'unknown';
  public packageAmount = 1;
  public packageUnit: BaseUnit = 'piece';
  public detailsOpen = false;
  private activeScanId: string | null = null;
  private activeBarcode = '';
  public readonly units: BaseUnit[] = ['g', 'ml', 'piece', 'bunch'];

  public ngOnInit(): void {
    this.subscription = this.catalog.observe().subscribe(nodes => {
      this.nodes = nodes;
      this.cdr.markForCheck();
    });
  }

  public ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  public get classes(): CatalogNode[] {
    return this.nodes.filter(node => node.kind === 'class' && node.parentId !== null);
  }

  public get categoryName(): string {
    return this.classes.find(node => node.id === this.selectedClassId)?.name ??
      (this.newClassName.trim() || this.pendingProduct?.name || '');
  }

  public ionViewDidEnter(): void {
    if (this.nativeScanner && !this.savedName && !this.pendingProduct && this.state === 'idle') void this.scan();
  }

  public async scan(): Promise<void> {
    if (this.state !== 'idle' || this.pendingProduct) return;
    this.setState('scanning');
    this.errorMessage = null;
    this.savedName = null;
    try {
      const result = await CapacitorBarcodeScanner.scanBarcode({
        hint: CapacitorBarcodeScannerTypeHintALLOption.ALL,
        cameraDirection: CapacitorBarcodeScannerCameraDirection.BACK,
        scanInstructions: 'Point the camera at a product barcode',
        cancelButtonAccessibilityLabel: 'Cancel barcode scan',
        torchButtonOnAccessibilityLabel: 'Turn flashlight off',
        torchButtonOffAccessibilityLabel: 'Turn flashlight on'
      });
      if (result.ScanResult) {
        this.barcodeInput = result.ScanResult;
        await this.addBarcode(result.ScanResult);
      }
    } catch (error) {
      if (!String(error).toLowerCase().includes('cancel')) this.errorMessage = 'Could not open the camera. Enter the barcode below.';
    } finally {
      this.setState('idle');
    }
  }

  public async addBarcode(value: string): Promise<void> {
    if (this.state !== 'idle' && this.state !== 'scanning') return;
    const barcode = value.trim();
    if (!/^\d{8,14}$/.test(barcode)) {
      this.errorMessage = 'Enter a valid 8–14 digit barcode.';
      this.setState('idle');
      return;
    }
    if (barcode !== this.activeBarcode || !this.activeScanId) {
      this.activeBarcode = barcode;
      this.activeScanId = uuidv4();
    }
    this.errorMessage = null;
    this.savedName = null;
    this.setState('looking-up');
    try {
      const existing = await this.catalog.byBarcode(barcode);
      if (existing) {
        await this.receive(existing);
        return;
      }
      const found = await this.lookup.getProduct(barcode);
      this.pendingProduct = found;
      this.detailsOpen = false;
      this.selectedClassId = this.catalog.suggestedClass(found.name, this.nodes)?.id ?? '';
      const parsed = parsePackageQuantity(found.packageQuantity);
      this.saleKind = parsed ? 'fixed' : 'unknown';
      this.packageAmount = parsed?.amount ?? 1;
      this.packageUnit = parsed?.unit ?? 'piece';
    } catch (error) {
      this.errorMessage = error instanceof ProductLookupError ? error.message : 'Could not process this product. Try again.';
    } finally {
      this.setState('idle');
    }
  }

  public async confirmProduct(): Promise<void> {
    if (!this.pendingProduct) return;
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
    } catch (error) {
      this.errorMessage = String(error instanceof Error ? error.message : error);
    } finally {
      this.setState('idle');
    }
  }

  private async receive(product: CatalogNode): Promise<void> {
    this.setState('saving');
    const listId = await firstValueFrom(this.categories.getSelectedCategoryId().pipe(take(1)));
    await this.stock.receive(product.id, {shoppingListId: listId ?? undefined, scanId: this.activeScanId ?? uuidv4()});
    this.savedName = product.name;
    this.barcodeInput = '';
    this.activeScanId = null;
    this.activeBarcode = '';
  }

  public get backLabel(): string {
    return this.route.snapshot.queryParamMap.get('from') === 'fridge' ? 'Back to fridge' : 'Back to shopping list';
  }

  public backToShopping(): void {
    void this.router.navigate([this.route.snapshot.queryParamMap.get('from') === 'fridge' ? '/tabs/fridge' : '/tabs/todo']);
  }

  public viewFridge(): void {
    void this.router.navigate(['/tabs/fridge']);
  }

  public addManually(): void {
    void this.router.navigate(['/tabs/items']);
  }

  private setState(state: ScanState): void {
    this.state = state;
    this.cdr.markForCheck();
  }
}
