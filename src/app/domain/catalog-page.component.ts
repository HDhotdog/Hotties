import {CommonModule} from '@angular/common';
import {Component, OnDestroy, OnInit, inject} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar, MenuController} from '@ionic/angular';
import {Subscription} from 'rxjs';
import {v4 as uuidv4} from 'uuid';
import {CatalogService} from './catalog.service';
import {CatalogNode, CatalogKind, SaleKind, blankClass} from './catalog.model';
import {BaseUnit} from './quantity';

@Component({selector: 'app-catalog-page', standalone: true,
  imports: [CommonModule, FormsModule, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar],
  template: `
    <ion-header><ion-toolbar><ion-buttons slot="start"><ion-button (click)="openMenu()" aria-label="Open menu"><ion-icon name="menu"></ion-icon></ion-button></ion-buttons>
      <ion-title>Product catalog</ion-title></ion-toolbar></ion-header>
    <ion-content class="ion-padding">
      <p>Categories contain other categories or specific products. Recipes and shopping entries can use either.</p>
      @if (error) { <p role="alert">{{error}}</p> }
      <ul class="tree">
        @for (node of sortedNodes; track node.id) {
          <li [style.padding-left.px]="depth(node) * 16">
            <button type="button" (click)="edit(node)">{{node.kind === 'class' ? '▣' : '▢'}} {{node.name}} {{node.brand ?? ''}}
              @if (node.kind === 'product') { <small>{{saleLabel(node)}}</small> }
            </button>
          </li>
        }
      </ul>
      <section>
        <h2>{{editingId ? 'Edit catalog node' : 'Add catalog node'}}</h2>
        @if (!editingId) {
          <label>Kind <select [(ngModel)]="kind"><option value="class">Category</option><option value="product">Specific product</option></select></label>
        }
        <label>Name <input [(ngModel)]="name" placeholder="Milk or chocolate bar"></label>
        <label>Parent category <select [(ngModel)]="parentId">
          @if (kind === 'class') { <option value="">Top-level root</option> }
          @for (node of classes; track node.id) { <option [value]="node.id">{{path(node)}}</option> }
        </select></label>
        @if (kind === 'product') {
          <label>Brand (optional) <input [(ngModel)]="brand"></label>
          <label>Barcode (optional) <input [(ngModel)]="barcode" inputmode="numeric"></label>
          <label>How it is sold <select [(ngModel)]="saleKind">
            <option value="fixed">Fixed package</option><option value="variable">Variable quantity</option><option value="unknown">Unknown package content</option>
          </select></label>
          @if (saleKind === 'fixed') {
            <label>Content per package <input type="number" min="0.001" step="any" [(ngModel)]="packageAmount"></label>
            <label>Unit <select [(ngModel)]="packageUnit">@for (unit of units; track unit) { <option [value]="unit">{{unit}}</option> }</select></label>
          } @else if (saleKind === 'variable') {
            <label>Sold by <select [(ngModel)]="variableUnit">@for (unit of units; track unit) { <option [value]="unit">{{unit}}</option> }</select></label>
          }
          @if (rawPackage) { <p>Original package label: {{rawPackage}}</p> }
        }
        <ion-button (click)="save()">Save</ion-button>
        @if (editingId) { <ion-button fill="clear" (click)="reset()">Cancel</ion-button> }
      </section>
    </ion-content>
  `,
  styles: [`select,input{display:block;width:100%;min-height:44px;margin:6px 0 14px;padding:8px;border:1px solid var(--ion-color-medium);border-radius:8px;background:var(--ion-background-color);color:var(--ion-text-color)}
    label{display:block}.tree{list-style:none;padding:0}.tree li button{display:block;width:100%;text-align:left;min-height:44px;border:0;background:transparent;color:inherit}.tree small{display:block;margin-left:22px}.tree li{border-bottom:1px solid var(--ion-color-light-shade)}section{margin-top:24px}`]
})
export class CatalogPageComponent implements OnInit, OnDestroy {
  private readonly menu = inject(MenuController);
  private readonly catalog = inject(CatalogService);
  private subscription?: Subscription;
  public nodes: CatalogNode[] = [];
  public editingId = '';
  public kind: CatalogKind = 'class';
  public name = '';
  public parentId = 'root-food';
  public brand = '';
  public barcode = '';
  public saleKind: SaleKind = 'fixed';
  public packageAmount = 1;
  public packageUnit: BaseUnit = 'piece';
  public variableUnit: BaseUnit = 'g';
  public rawPackage: string | null = null;
  public readonly units: BaseUnit[] = ['g', 'ml', 'piece', 'bunch', 'pinch'];
  public error = '';

  public ngOnInit(): void { this.subscription = this.catalog.observe().subscribe(nodes => this.nodes = nodes); }
  public ngOnDestroy(): void { this.subscription?.unsubscribe(); }
  public openMenu(): void { void this.menu.open('main-menu'); }
  public get classes(): CatalogNode[] { return this.nodes.filter(node => node.kind === 'class' && node.id !== this.editingId); }
  public get sortedNodes(): CatalogNode[] {
    const result: CatalogNode[] = [];
    const visit = (parentId: string | null): void => {
      for (const node of this.nodes.filter(item => item.parentId === parentId).sort((a, b) => a.name.localeCompare(b.name))) {
        result.push(node);
        if (node.kind === 'class') visit(node.id);
      }
    };
    visit(null);
    return result;
  }
  public depth(node: CatalogNode): number { return this.catalog.depth(node.id, this.nodes); }
  public path(node: CatalogNode): string {
    const names = [node.name]; let current = node; const visited = new Set<string>();
    while (current.parentId && !visited.has(current.id)) {
      visited.add(current.id); const parent = this.nodes.find(item => item.id === current.parentId);
      if (!parent) break; names.unshift(parent.name); current = parent;
    }
    return names.join(' / ');
  }
  public saleLabel(node: CatalogNode): string {
    return node.saleKind === 'fixed' ? `${node.packageAmount} ${node.packageUnit} per package` :
      node.saleKind === 'variable' ? `sold by ${node.variableUnit}` : 'package content unknown';
  }
  public edit(node: CatalogNode): void {
    this.editingId = node.id; this.kind = node.kind; this.name = node.name; this.parentId = node.parentId ?? '';
    this.brand = node.brand ?? ''; this.barcode = node.barcodes[0] ?? ''; this.saleKind = node.saleKind;
    this.packageAmount = node.packageAmount ?? 1; this.packageUnit = node.packageUnit ?? 'piece';
    this.variableUnit = node.variableUnit ?? 'g'; this.rawPackage = node.rawPackage; this.error = '';
  }
  public reset(): void {
    this.editingId = ''; this.kind = 'class'; this.name = ''; this.parentId = 'root-food';
    this.brand = ''; this.barcode = ''; this.saleKind = 'fixed'; this.packageAmount = 1;
    this.packageUnit = 'piece'; this.variableUnit = 'g'; this.rawPackage = null; this.error = '';
  }
  public async save(): Promise<void> {
    this.error = '';
    try {
      const id = this.editingId || uuidv4();
      const parentId = this.parentId || null;
      const node: CatalogNode = this.kind === 'class' ? blankClass(id, this.name, parentId) :
        {id, parentId, kind: 'product', name: this.name, brand: this.brand.trim() || null,
          barcodes: this.barcode.trim() ? [this.barcode.trim()] : [], saleKind: this.saleKind,
          packageAmount: this.saleKind === 'fixed' ? Number(this.packageAmount) : null,
          packageUnit: this.saleKind === 'fixed' ? this.packageUnit : null,
          variableUnit: this.saleKind === 'variable' ? this.variableUnit : null, rawPackage: this.rawPackage};
      await this.catalog.save(node); this.reset();
    } catch (error) { this.error = String(error instanceof Error ? error.message : error); }
  }
}
