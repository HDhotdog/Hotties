import {CommonModule} from '@angular/common';
import {Component, OnDestroy, OnInit, inject} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {Router} from '@angular/router';
import {IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar, MenuController} from '@ionic/angular';
import {Subscription} from 'rxjs';
import {CatalogService} from './catalog.service';
import {CatalogNode} from './catalog.model';
import {StockService} from './stock.service';
import {StockLot} from './shopping.model';
import {BaseUnit, formatQuantity} from './quantity';

@Component({selector: 'app-stock-page', standalone: true,
  imports: [CommonModule, FormsModule, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar],
  template: `
    <ion-header><ion-toolbar><ion-buttons slot="start"><ion-button (click)="openMenu()" aria-label="Open menu"><ion-icon name="menu"></ion-icon></ion-button></ion-buttons>
      <ion-title>Fridge and stock</ion-title></ion-toolbar></ion-header>
    <ion-content class="ion-padding">
      @if (error) { <p role="alert">{{error}}</p> }
      <p>Stock is kept by purchase or expiry lot. Quantities can be reduced as products are used.</p>
      <ul class="lots">
        @for (lot of lots; track lot.id) {
          <li>
            <strong>{{productName(lot.productId)}}</strong>
            <span>{{formatLot(lot)}} remaining</span>
            @if (lot.expiryDate) { <small>Expires {{lot.expiryDate}}</small> }
            <button type="button" (click)="edit(lot)">Edit</button>
            <button type="button" (click)="remove(lot)">Remove</button>
          </li>
        } @empty { <li>No stock yet. Scan a product or add a lot below.</li> }
      </ul>
      <section>
        <h2>{{editing ? 'Edit lot' : 'Add stock'}}</h2>
        @if (!editing) {
          <label>Product <select [(ngModel)]="productId">
            <option value="">Choose a product</option>
            @for (product of products; track product.id) { <option [value]="product.id">{{product.name}} {{product.brand ?? ''}}</option> }
          </select></label>
          @if (selectedProduct?.saleKind === 'variable') {
            <label>Acquired amount <input type="number" min="0.001" step="any" [(ngModel)]="bulkAmount"></label>
            <p>Unit: {{selectedProduct?.variableUnit}}</p>
          } @else {
            <label>Packages acquired <input type="number" min="1" step="1" [(ngModel)]="packages"></label>
            @if (selectedProduct?.saleKind === 'fixed') { <p>Each package: {{selectedProduct?.packageAmount}} {{selectedProduct?.packageUnit}}</p> }
            @if (selectedProduct?.saleKind === 'unknown') { <p>Package content is unknown; recipe quantity checks will remain unknown.</p> }
          }
        } @else {
          <p>{{productName(editing.productId)}} · acquired {{editing.acquiredAmount}} {{editing.acquiredUnit}}</p>
          <label>Remaining amount <input type="number" min="0" step="any" [(ngModel)]="remainingAmount"></label>
          <p>Unit: {{editing.acquiredUnit}}</p>
        }
        <label>Expiry date <input type="date" [(ngModel)]="expiryDate"></label>
        <ion-button (click)="save()">{{editing ? 'Save lot' : 'Add lot'}}</ion-button>
        @if (editing) { <ion-button fill="clear" (click)="cancelEdit()">Cancel</ion-button> }
        <ion-button fill="clear" (click)="openCatalog()">Manage products</ion-button>
      </section>
    </ion-content>
  `,
  styles: [`select,input{display:block;width:100%;min-height:44px;margin:6px 0 14px;padding:8px;border:1px solid var(--ion-color-medium);border-radius:8px;background:var(--ion-background-color);color:var(--ion-text-color)}
    label{display:block}.lots{list-style:none;padding:0}.lots li{border-bottom:1px solid var(--ion-color-light-shade);padding:12px 0}.lots span,.lots small{display:block}.lots button{min-height:44px;margin-right:12px}`]
})
export class StockPageComponent implements OnInit, OnDestroy {
  private readonly menu = inject(MenuController);
  private readonly router = inject(Router);
  private readonly catalog = inject(CatalogService);
  private readonly stock = inject(StockService);
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

  public ngOnInit(): void {
    this.subscriptions.add(this.catalog.observe().subscribe(nodes => this.nodes = nodes));
    this.subscriptions.add(this.stock.observe().subscribe(lots => this.lots = lots));
  }
  public ngOnDestroy(): void { this.subscriptions.unsubscribe(); }
  public openMenu(): void { void this.menu.open('main-menu'); }
  public openCatalog(): void { void this.router.navigate(['/tabs/items']); }
  public get products(): CatalogNode[] { return this.nodes.filter(node => node.kind === 'product'); }
  public get selectedProduct(): CatalogNode | null { return this.products.find(node => node.id === this.productId) ?? null; }
  public productName(id: string): string { return this.nodes.find(node => node.id === id)?.name ?? 'Unknown product'; }
  public formatLot(lot: StockLot): string { return formatQuantity({amount: lot.remainingAmount, unit: lot.acquiredUnit}); }
  public edit(lot: StockLot): void { this.editing = lot; this.remainingAmount = lot.remainingAmount; this.expiryDate = lot.expiryDate ?? ''; }
  public cancelEdit(): void { this.editing = null; this.expiryDate = ''; }
  public async remove(lot: StockLot): Promise<void> { await this.stock.remove(lot.id); }
  public async save(): Promise<void> {
    this.error = '';
    try {
      if (this.editing) {
        await this.stock.save({...this.editing, remainingAmount: Number(this.remainingAmount), expiryDate: this.expiryDate || null});
        this.cancelEdit();
      } else {
        if (!this.selectedProduct) throw new Error('Choose a product first.');
        const bulkQuantity = this.selectedProduct.saleKind === 'variable'
          ? {amount: Number(this.bulkAmount), unit: this.selectedProduct.variableUnit as BaseUnit} : undefined;
        await this.stock.receive(this.selectedProduct.id, {packages: Number(this.packages), bulkQuantity,
          expiryDate: this.expiryDate || null});
        this.expiryDate = ''; this.packages = 1;
      }
    } catch (error) { this.error = String(error instanceof Error ? error.message : error); }
  }
}
