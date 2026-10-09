import {CommonModule} from '@angular/common';
import {Component, OnDestroy, OnInit, inject} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {Router} from '@angular/router';
import {IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar, MenuController} from '@ionic/angular';
import {Subscription, firstValueFrom, take} from 'rxjs';
import {CategoryService} from '../category/category.service';
import {Category} from '../category/category.dto';
import {CatalogService} from './catalog.service';
import {CatalogNode} from './catalog.model';
import {ShoppingService} from './shopping.service';
import {StockService} from './stock.service';
import {ShoppingEntry, StockLot, NeedKind} from './shopping.model';
import {BaseUnit, normalizeQuantity, QuantityUnit} from './quantity';

@Component({
  selector: 'app-shopping-page', standalone: true,
  imports: [CommonModule, FormsModule, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar],
  template: `
    <ion-header><ion-toolbar>
      <ion-buttons slot="start"><ion-button (click)="openMenu()" aria-label="Open menu"><ion-icon name="menu"></ion-icon></ion-button></ion-buttons>
      <ion-title>Shopping</ion-title>
      <ion-buttons slot="end"><ion-button (click)="openScanner()" aria-label="Scan acquired products"><ion-icon name="scan-outline"></ion-icon></ion-button></ion-buttons>
    </ion-toolbar></ion-header>
    <ion-content class="ion-padding">
      <label>Shopping list
        <select [(ngModel)]="selectedListId" (ngModelChange)="selectList()">
          @for (list of lists; track list.id) { <option [value]="list.id">{{list.name}}</option> }
        </select>
      </label>
      @if (error) { <p role="alert">{{error}}</p> }
      <ul class="entries">
        @for (entry of entries; track entry.id) {
          <li [class.checked]="entry.checked">
            <button type="button" (click)="toggle(entry)" [attr.aria-label]="entry.checked ? 'Uncheck' : 'Check'">
              {{entry.checked ? '☑' : '□'}}
            </button>
            <div><strong>{{entry.label}}</strong>
              @if (entry.kind === 'product') {
                <small>{{needLabel(entry)}}
                  @if (progress(entry) > 0) { · {{remainingLabel(entry)}} remaining }
                </small>
                @if (entry.needKind === 'quantity' && matchingProducts(entry).length > 0) {
                  <select class="package-choice" [(ngModel)]="suggestionProductIds[entry.id]" [attr.aria-label]="'Package suggestion for ' + entry.label">
                    <option value="">Choose a product for package suggestion</option>
                    @for (product of matchingProducts(entry); track product.id) {
                      <option [value]="product.id">{{product.name}} {{product.brand ?? ''}}</option>
                    }
                  </select>
                  @if (suggestedPackagesForEntry(entry); as count) { <small>Suggested purchase: {{count}} package(s)</small> }
                }
              } @else { <small>Task · remove manually when finished</small> }
            </div>
            <button type="button" (click)="remove(entry)" [attr.aria-label]="'Remove ' + entry.label">×</button>
          </li>
        } @empty { <li>No shopping entries yet.</li> }
      </ul>
      <section class="entry-form">
        <h2>Add to list</h2>
        <label>Kind <select [(ngModel)]="kind"><option value="product">Product or class</option><option value="task">Errand or task</option></select></label>
        @if (kind === 'task') {
          <label>Task <input [(ngModel)]="newName" placeholder="Pick up parcel"></label>
        } @else {
          <label>Existing class or product
            <select [(ngModel)]="selectedNodeId">
              <option value="">Create a new food class from name below</option>
              @for (node of nodesForSelection; track node.id) {
                <option [value]="node.id">{{nodeLabel(node)}}</option>
              }
            </select>
          </label>
          @if (!selectedNodeId) { <label>Class name <input [(ngModel)]="newName" placeholder="Milk"></label> }
          <label>Need <select [(ngModel)]="needKind">
            <option value="unspecified">Unspecified</option><option value="quantity">Measured amount</option>
            @if (selectedProduct) { <option value="packages">Whole packages</option> }
          </select></label>
          @if (needKind !== 'unspecified') {
            <label>Amount <input type="number" min="0.001" step="any" [(ngModel)]="needAmount"></label>
            @if (needKind === 'quantity') {
              <label>Unit <select [(ngModel)]="needUnit">
                @for (unit of units; track unit) { <option [value]="unit">{{unit}}</option> }
              </select></label>
              @if (selectedProduct && suggestedPackages !== null) {
                <p>Suggested purchase: {{suggestedPackages}} package(s)</p>
              }
            }
          }
        }
        <ion-button (click)="add()">Add</ion-button>
      </section>
    </ion-content>
  `,
  styles: [`
    select,input{display:block;width:100%;min-height:44px;margin:6px 0 14px;padding:8px;border:1px solid var(--ion-color-medium);border-radius:8px;background:var(--ion-background-color);color:var(--ion-text-color)}
    .package-choice{font-size:.85rem;margin:4px 0}
    label{display:block}.entries{list-style:none;padding:0}.entries li{display:flex;gap:12px;align-items:center;padding:12px 4px;border-bottom:1px solid var(--ion-color-light-shade)}
    .entries li div{flex:1}.entries small{display:block}.entries button{min-width:44px;min-height:44px;border:0;background:transparent;font-size:24px;color:inherit}
    .entries li.checked{opacity:.65}.entries li.checked strong{text-decoration:line-through}.entry-form{margin-top:24px}
  `]
})
export class ShoppingPageComponent implements OnInit, OnDestroy {
  private readonly menu = inject(MenuController);
  private readonly router = inject(Router);
  private readonly categories = inject(CategoryService);
  private readonly catalog = inject(CatalogService);
  private readonly shopping = inject(ShoppingService);
  private readonly stock = inject(StockService);
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

  public async ngOnInit(): Promise<void> {
    this.subscriptions.add(this.catalog.observe().subscribe(nodes => this.nodes = nodes));
    this.subscriptions.add(this.stock.observe().subscribe(lots => this.lots = lots));
    this.lists = await firstValueFrom(this.categories.getCategories().pipe(take(1)));
    this.selectedListId = (await firstValueFrom(this.categories.getSelectedCategoryId())) ?? this.lists[0]?.id ?? '';
    this.selectList();
    await this.shopping.reconcileCompleted(await this.stock.all());
  }

  public ngOnDestroy(): void { this.entriesSubscription?.unsubscribe(); this.subscriptions.unsubscribe(); }
  public openMenu(): void { void this.menu.open('main-menu'); }
  public openScanner(): void { void this.router.navigate(['/tabs/todo/scan']); }
  public selectList(): void {
    this.entriesSubscription?.unsubscribe();
    if (this.selectedListId) this.entriesSubscription = this.shopping.observe(this.selectedListId).subscribe(entries => this.entries = entries);
    const selected = this.lists.find(list => list.id === this.selectedListId);
    if (selected) void firstValueFrom(this.categories.saveCurrentCategory(selected));
  }

  public get nodesForSelection(): CatalogNode[] { return this.nodes.filter(node => node.parentId !== null); }
  public get selectedProduct(): CatalogNode | null {
    const node = this.nodes.find(item => item.id === this.selectedNodeId);
    return node?.kind === 'product' ? node : null;
  }
  public get suggestedPackages(): number | null {
    if (!this.selectedProduct || this.needKind !== 'quantity') return null;
    try { return this.stock.suggestedPackages(this.selectedProduct, normalizeQuantity({amount: this.needAmount, unit: this.needUnit})); }
    catch { return null; }
  }
  public nodeLabel(node: CatalogNode): string {
    return `${node.kind === 'class' ? 'Category' : 'Product'} · ${node.name}${node.brand ? ' · ' + node.brand : ''}`;
  }
  public needLabel(entry: ShoppingEntry): string {
    if (entry.needKind === 'unspecified') return 'One matching purchase';
    return `${entry.needAmount} ${entry.needUnit}${entry.needKind === 'packages' ? '(s)' : ''} needed`;
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
    return this.stock.suggestedPackages(product, {amount: Math.max(0, (entry.needAmount ?? 0) - this.progress(entry)), unit: entry.needUnit});
  }

  public async add(): Promise<void> {
    this.error = '';
    try {
      if (!this.selectedListId) throw new Error('Create a shopping list first.');
      if (this.kind === 'task') await this.shopping.addTask(this.selectedListId, this.newName);
      else {
        const target = this.selectedNodeId || (await this.catalog.findOrCreateClass(this.newName)).id;
        if (this.needKind === 'quantity') await this.shopping.addProduct(this.selectedListId, target,
          {kind: 'quantity', quantity: normalizeQuantity({amount: this.needAmount, unit: this.needUnit})});
        else if (this.needKind === 'packages') await this.shopping.addProduct(this.selectedListId, target,
          {kind: 'packages', count: this.needAmount});
        else await this.shopping.addProduct(this.selectedListId, target, {kind: 'unspecified'});
      }
      this.newName = ''; this.selectedNodeId = ''; this.needKind = 'unspecified'; this.needAmount = 1;
    } catch (error) { this.error = String(error instanceof Error ? error.message : error); }
  }
  public async toggle(entry: ShoppingEntry): Promise<void> { await this.shopping.toggleChecked(entry); }
  public async remove(entry: ShoppingEntry): Promise<void> { await this.shopping.remove(entry.id); }
}
