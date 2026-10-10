import {CommonModule} from '@angular/common';
import {ChangeDetectorRef, Component, ElementRef, inject, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar,
  MenuController
} from '@ionic/angular';
import {Subscription} from 'rxjs';
import {v4 as uuidv4} from 'uuid';
import {CatalogDeleteImpact, CatalogService} from './catalog.service';
import {blankClass, CatalogKind, CatalogNode, SaleKind} from './catalog.model';
import {BaseUnit} from './quantity';

@Component({
  selector: 'app-catalog-page', standalone: true,
  imports: [CommonModule, FormsModule, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar],
  templateUrl: './catalog-page.component.html',
  styleUrls: ['./catalog-page.component.scss']
})
export class CatalogPageComponent implements OnInit, OnDestroy {
  @ViewChild('nameInput') private nameInput?: ElementRef<HTMLInputElement>;
  private readonly menu = inject(MenuController);
  private readonly catalog = inject(CatalogService);
  private readonly cdr = inject(ChangeDetectorRef);
  private subscription?: Subscription;
  private foldInitialized = false;
  private deletePreviewVersion = 0;

  public nodes: CatalogNode[] = [];
  public collapsedIds = new Set<string>();
  public editorOpen = false;
  public editingId = '';
  public addParentId: string | null = null;
  public kind: CatalogKind = 'class';
  public name = '';
  public parentId = 'root-food';
  public brand = '';
  public barcode = '';
  public saleKind: SaleKind = 'unknown';
  public packageAmount = 1;
  public packageUnit: BaseUnit = 'piece';
  public variableUnit: BaseUnit = 'g';
  public rawPackage: string | null = null;
  public productDetailsOpen = false;
  public readonly units: BaseUnit[] = ['g', 'ml', 'piece', 'bunch', 'pinch'];
  public error = '';
  public deleteConfirmationOpen = false;
  public deleteDescendants = false;
  public deleteImpact: CatalogDeleteImpact | null = null;
  public deleteBusy = false;

  public ngOnInit(): void {
    this.subscription = this.catalog.observe().subscribe(nodes => {
      this.nodes = nodes;
      if (!this.foldInitialized && nodes.length) {
        this.collapsedIds = new Set(nodes.filter(node => node.kind === 'class' && node.parentId !== null).map(node => node.id));
        this.foldInitialized = true;
      }
      this.cdr.detectChanges();
    });
  }

  public ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  public openMenu(): void {
    void this.menu.open('main-menu');
  }

  public get selectedNode(): CatalogNode | null {
    return this.nodes.find(node => node.id === this.editingId) ?? null;
  }

  public canDelete(node: CatalogNode | null): boolean {
    return !!node && node.id !== 'root-food' && node.id !== 'root-household';
  }

  public get classes(): CatalogNode[] {
    const excluded = new Set(this.editingId ? [this.editingId, ...this.catalog.descendantsOf(this.editingId, this.nodes).map(node => node.id)] : []);
    return this.nodes.filter(node => node.kind === 'class' && !excluded.has(node.id));
  }

  public get visibleNodes(): CatalogNode[] {
    const result: CatalogNode[] = [];
    const visited = new Set<string>();
    const visit = (parentId: string | null): void => {
      for (const node of this.nodes.filter(item => item.parentId === parentId).sort((a, b) => a.name.localeCompare(b.name))) {
        if (visited.has(node.id)) continue;
        visited.add(node.id);
        result.push(node);
        if (node.kind === 'class' && !this.collapsedIds.has(node.id)) visit(node.id);
      }
    };
    visit(null);
    return result;
  }

  public hasChildren(node: CatalogNode): boolean {
    return this.nodes.some(child => child.parentId === node.id);
  }

  public isExpanded(node: CatalogNode): boolean {
    return !this.collapsedIds.has(node.id);
  }

  public toggleExpanded(node: CatalogNode): void {
    if (node.kind !== 'class' || !this.hasChildren(node)) return;
    if (this.collapsedIds.has(node.id)) this.collapsedIds.delete(node.id);
    else {
      this.collapsedIds.add(node.id);
      const hiddenIds = new Set([node.id, ...this.catalog.descendantsOf(node.id, this.nodes).map(child => child.id)]);
      if (hiddenIds.has(this.editingId) || (this.addParentId && hiddenIds.has(this.addParentId))) this.reset();
    }
  }

  public indent(node: CatalogNode): number {
    return Math.min(this.catalog.depth(node.id, this.nodes) * 14, 70);
  }

  public path(node: CatalogNode): string {
    const names = [node.name];
    let current = node;
    const visited = new Set<string>();
    while (current.parentId && !visited.has(current.id)) {
      visited.add(current.id);
      const parent = this.nodes.find(item => item.id === current.parentId);
      if (!parent) break;
      names.unshift(parent.name);
      current = parent;
    }
    return names.join(' / ');
  }

  public saleLabel(node: CatalogNode): string {
    return node.saleKind === 'fixed' ? `${node.packageAmount} ${node.packageUnit} per package` :
      node.saleKind === 'variable' ? `sold by ${node.variableUnit}` : 'package size unknown';
  }

  public parentLabel(): string {
    const parent = this.nodes.find(node => node.id === this.parentId);
    return parent ? this.path(parent) : 'Top level';
  }

  public get deleteDescendantCount(): number {
    const node = this.selectedNode;
    return node?.kind === 'class' ? this.catalog.descendantsOf(node.id, this.nodes).length : 0;
  }

  public openAdd(parent: CatalogNode | null): void {
    if (this.editorOpen && !this.editingId && this.addParentId === (parent?.id ?? null)) {
      this.reset();
      return;
    }
    this.reset();
    this.editorOpen = true;
    this.addParentId = parent?.id ?? null;
    this.parentId = parent?.id ?? '';
    this.kind = parent?.parentId === null || !parent ? 'class' : 'product';
    this.saleKind = 'unknown';
    this.productDetailsOpen = false;
    if (parent) this.collapsedIds.delete(parent.id);
    this.cdr.detectChanges();
    setTimeout(() => this.nameInput?.nativeElement.focus());
  }

  public edit(node: CatalogNode): void {
    if (this.editorOpen && (this.editingId === node.id || (!this.editingId && this.addParentId === node.id))) {
      this.reset();
      return;
    }
    this.reset();
    this.editorOpen = true;
    this.editingId = node.id;
    this.kind = node.kind;
    this.name = node.name;
    this.parentId = node.parentId ?? '';
    this.brand = node.brand ?? '';
    this.barcode = node.barcodes[0] ?? '';
    this.saleKind = node.saleKind;
    this.packageAmount = node.packageAmount ?? 1;
    this.packageUnit = node.packageUnit ?? 'piece';
    this.variableUnit = node.variableUnit ?? 'g';
    this.rawPackage = node.rawPackage;
    this.productDetailsOpen = node.kind === 'product';
  }

  public reset(): void {
    this.deletePreviewVersion++;
    this.editorOpen = false;
    this.editingId = '';
    this.addParentId = null;
    this.kind = 'class';
    this.name = '';
    this.parentId = 'root-food';
    this.brand = '';
    this.barcode = '';
    this.saleKind = 'unknown';
    this.packageAmount = 1;
    this.packageUnit = 'piece';
    this.variableUnit = 'g';
    this.rawPackage = null;
    this.error = '';
    this.productDetailsOpen = false;
    this.cancelDelete();
  }

  public async save(): Promise<void> {
    this.error = '';
    try {
      const id = this.editingId || uuidv4();
      const parentId = this.parentId || null;
      const node: CatalogNode = this.kind === 'class' ? blankClass(id, this.name, parentId) :
        {
          id, parentId, kind: 'product', name: this.name, brand: this.brand.trim() || null,
          barcodes: this.barcode.trim() ? [this.barcode.trim()] : [], saleKind: this.saleKind,
          packageAmount: this.saleKind === 'fixed' ? Number(this.packageAmount) : null,
          packageUnit: this.saleKind === 'fixed' ? this.packageUnit : null,
          variableUnit: this.saleKind === 'variable' ? this.variableUnit : null, rawPackage: this.rawPackage
        };
      await this.catalog.save(node);
      if (parentId) this.collapsedIds.delete(parentId);
      this.reset();
    } catch (error) {
      this.error = String(error instanceof Error ? error.message : error);
    } finally {
      this.cdr.detectChanges();
    }
  }

  public async beginDelete(): Promise<void> {
    if (!this.canDelete(this.selectedNode)) return;
    this.deleteConfirmationOpen = true;
    this.deleteDescendants = false;
    await this.refreshDeleteImpact();
  }

  public async setDeleteDescendants(value: boolean): Promise<void> {
    this.deleteDescendants = value;
    await this.refreshDeleteImpact();
  }

  private async refreshDeleteImpact(): Promise<void> {
    this.error = '';
    this.deleteImpact = null;
    const version = ++this.deletePreviewVersion;
    try {
      const impact = await this.catalog.previewDelete(this.editingId, this.deleteDescendants);
      if (version === this.deletePreviewVersion) this.deleteImpact = impact;
    } catch (error) {
      if (version === this.deletePreviewVersion) this.error = String(error instanceof Error ? error.message : error);
    } finally {
      this.cdr.detectChanges();
    }
  }

  public cancelDelete(): void {
    this.deletePreviewVersion++;
    this.deleteConfirmationOpen = false;
    this.deleteDescendants = false;
    this.deleteImpact = null;
  }

  public async confirmDelete(): Promise<void> {
    if (!this.deleteImpact || this.deleteBusy || !this.editingId) return;
    this.deleteBusy = true;
    this.error = '';
    try {
      await this.catalog.delete(this.editingId, this.deleteDescendants);
      this.reset();
    } catch (error) {
      this.error = String(error instanceof Error ? error.message : error);
    } finally {
      this.deleteBusy = false;
      this.cdr.detectChanges();
    }
  }
}
