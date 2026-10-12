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
  private readonly subscriptions = new Subscription();
  private entriesSubscription?: Subscription;
  public lists: Category[] = [];
  public selectedListId = '';
  public entries: ShoppingEntry[] = [];
  public nodes: CatalogNode[] = [];
  public lots: StockLot[] = [];
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

  public async ngOnInit(): Promise<void> {
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
    this.subscriptions.add(this.categories.getCategories().subscribe(lists => {
      this.lists = lists;
      if (!lists.some(list => list.id === this.selectedListId)) {
        this.selectedListId = lists[0]?.id ?? '';
        this.selectList();
      }
      this.cdr.detectChanges();
    }));
    this.cdr.detectChanges();
  }

  public ngOnDestroy(): void {
    this.entriesSubscription?.unsubscribe();
    this.subscriptions.unsubscribe();
  }

  public openMenu(): void {
    void this.menu.open('main-menu');
  }

  public openScanner(): void {
    void this.router.navigate(['/tabs/shopping/scan']);
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
    if (!query || !this.suggestionsOpen) return [];
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
      }), this.nodes);
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
    return this.shopping.progressFrom(entry, this.lots);
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
    }, this.nodes);
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
    if (this.newName.trim().length === 0) return;
    this.error = '';
    this.adding = true;
    try {
      if (!this.selectedListId) {
        throw new Error('Create a shopping list first.');
      }
      const originalUserInput = this.newName.trim();
      const userInput = originalUserInput.toLocaleLowerCase();
      const exactClass = this.nodesForSelection.find(node => node.kind === 'class' && node.name.toLocaleLowerCase() === userInput);
      const exactProduct = this.nodesForSelection.find(node => node.kind === 'product' && node.name.toLocaleLowerCase() === userInput);
      const targetNode = this.selectedNodeId ? this.nodes.find(node => node.id === this.selectedNodeId) : exactClass ?? exactProduct;
      const target = targetNode?.id ?? (await this.catalog.findClass(this.newName))?.id;
      const optionalName = targetNode?.name ?? originalUserInput;
      const needKind = this.detailsOpen ? this.needKind : targetNode?.kind === 'product' ? 'packages' : 'unspecified';
      if (needKind === 'quantity') {
        await this.shopping.addProduct(this.selectedListId, target,
          {kind: 'quantity', quantity: normalizeQuantity({amount: this.needAmount, unit: this.needUnit})}, optionalName);
      } else if (needKind === 'packages') {
        await this.shopping.addProduct(this.selectedListId, target,
          {kind: 'packages', count: this.needAmount}, optionalName);
      } else {
        await this.shopping.addProduct(this.selectedListId, target, {kind: 'unspecified'}, optionalName);
      }
      this.newName = '';
      this.selectedNodeId = '';
      this.needKind = 'unspecified';
      this.needAmount = 1;
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
}
