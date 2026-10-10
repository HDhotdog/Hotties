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

  public ngOnInit(): void {
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
  }

  public chooseSuggestion(node: CatalogNode): void {
    this.quickName = node.name;
    this.productId = node.kind === 'product' ? node.id : '';
    this.suggestionsOpen = false;
    if (node.kind === 'product' && node.saleKind === 'variable') {
      this.detailsOpen = true;
      setTimeout(() => this.bulkInput?.nativeElement.focus());
    } else if (!this.detailsOpen) void this.addQuick(node);
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
