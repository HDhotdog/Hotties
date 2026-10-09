import {Injectable, inject} from '@angular/core';
import {from, Observable, switchMap, map} from 'rxjs';
import {v4 as uuidv4} from 'uuid';
import {DatabaseService} from '../database/database';
import {CatalogNode, blankClass} from './catalog.model';
import {BaseQuantity, BaseUnit, parsePackageQuantity} from './quantity';
import {FoodProduct} from '../scanner/open-food-facts.service';

@Injectable({providedIn: 'root'})
export class CatalogService {
  private readonly database = inject(DatabaseService);

  public async all(): Promise<CatalogNode[]> {
    const db = await this.database.getDb();
    const docs = await db['catalog_nodes'].find().exec();
    return docs.map((doc: any) => doc.toJSON() as CatalogNode);
  }

  public observe(): Observable<CatalogNode[]> {
    return from(this.database.getDb()).pipe(switchMap(db => db['catalog_nodes'].find().$),
      map((docs: any[]) => docs.map(doc => doc.toJSON() as CatalogNode)));
  }

  public async byId(id: string): Promise<CatalogNode> {
    const node = (await this.all()).find(item => item.id === id);
    if (!node) throw new Error('Catalog item not found.');
    return node;
  }

  public async byBarcode(barcode: string): Promise<CatalogNode | null> {
    return (await this.all()).find(node => node.kind === 'product' && node.barcodes.includes(barcode)) ?? null;
  }

  public descendantsOf(classId: string, nodes: CatalogNode[]): CatalogNode[] {
    const result: CatalogNode[] = [];
    const visit = (id: string): void => {
      for (const child of nodes.filter(node => node.parentId === id)) {
        result.push(child);
        if (child.kind === 'class') visit(child.id);
      }
    };
    visit(classId);
    return result;
  }

  public depth(nodeId: string, nodes: CatalogNode[]): number {
    let depth = 0;
    let current = nodes.find(node => node.id === nodeId);
    const seen = new Set<string>();
    while (current?.parentId && !seen.has(current.id)) {
      seen.add(current.id);
      depth++;
      current = nodes.find(node => node.id === current?.parentId);
    }
    return depth;
  }

  public matches(targetId: string, productId: string, nodes: CatalogNode[]): boolean {
    if (targetId === productId) return true;
    let current = nodes.find(node => node.id === productId);
    const seen = new Set<string>();
    while (current?.parentId && !seen.has(current.id)) {
      if (current.parentId === targetId) return true;
      seen.add(current.id);
      current = nodes.find(node => node.id === current?.parentId);
    }
    return false;
  }

  public async save(node: CatalogNode): Promise<void> {
    const nodes = await this.all();
    if (!node.name.trim()) throw new Error('A catalog name is required.');
    if (node.kind === 'class' && nodes.some(other => other.id !== node.id && other.kind === 'class' &&
      other.parentId === node.parentId && other.name.trim().toLocaleLowerCase() === node.name.trim().toLocaleLowerCase())) {
      throw new Error('A class with this name already exists under that parent.');
    }
    if (node.kind === 'class' && (node.barcodes.length || node.saleKind !== 'unknown')) {
      throw new Error('Only products can have barcodes or package details.');
    }
    if (node.kind === 'product' && !node.parentId) throw new Error('Products need a parent class.');
    if (node.saleKind === 'fixed' && (!(node.packageAmount && node.packageAmount > 0) || !node.packageUnit)) {
      throw new Error('A fixed package needs its content amount and unit.');
    }
    if (node.saleKind === 'variable' && !node.variableUnit) throw new Error('Variable products need a unit.');
    if (node.parentId) {
      const parent = nodes.find(candidate => candidate.id === node.parentId);
      if (!parent || parent.kind !== 'class' || this.matches(node.id, parent.id, nodes)) {
        throw new Error('Choose a valid parent class without a cycle.');
      }
    }
    if (node.kind === 'product' && nodes.some(candidate => candidate.parentId === node.id)) {
      throw new Error('Products must remain leaves.');
    }
    const barcodes = node.barcodes.map(value => value.trim()).filter(Boolean);
    if (barcodes.some(code => nodes.some(other => other.id !== node.id && other.barcodes.includes(code)))) {
      throw new Error('Barcode already belongs to another product.');
    }
    const db = await this.database.getDb();
    await db['catalog_nodes'].upsert({...node, name: node.name.trim(), barcodes});
  }

  public async createClass(name: string, parentId: string | null = 'root-food'): Promise<CatalogNode> {
    const node = blankClass(uuidv4(), name.trim(), parentId);
    await this.save(node);
    return node;
  }

  public async findOrCreateClass(name: string, parentId = 'root-food'): Promise<CatalogNode> {
    const normalized = name.trim().toLocaleLowerCase();
    const found = (await this.all()).find(node => node.kind === 'class' && node.parentId === parentId &&
      node.name.toLocaleLowerCase() === normalized);
    return found ?? this.createClass(name, parentId);
  }

  public suggestedClass(name: string, nodes: CatalogNode[]): CatalogNode | null {
    const text = name.toLocaleLowerCase();
    return nodes.filter(node => node.kind === 'class' && node.parentId !== null &&
      text.includes(node.name.toLocaleLowerCase())).sort((a, b) => this.depth(b.id, nodes) - this.depth(a.id, nodes))[0] ?? null;
  }

  public productDraft(food: FoodProduct, parentId: string, packageContent: BaseQuantity | null = parsePackageQuantity(food.packageQuantity)): CatalogNode {
    return {id: uuidv4(), parentId, kind: 'product', name: food.name, brand: food.brand,
      barcodes: [food.barcode], saleKind: packageContent ? 'fixed' : 'unknown',
      packageAmount: packageContent?.amount ?? null, packageUnit: packageContent?.unit ?? null,
      variableUnit: null, rawPackage: food.packageQuantity};
  }

  public createLooseDraft(name: string, parentId: string, unit: BaseUnit): CatalogNode {
    return {id: uuidv4(), parentId, kind: 'product', name, brand: null, barcodes: [], saleKind: 'variable',
      packageAmount: null, packageUnit: null, variableUnit: unit, rawPackage: null};
  }
}
