import {BaseUnit} from './quantity';

export type CatalogKind = 'class' | 'product';
export type SaleKind = 'fixed' | 'variable' | 'unknown';
export type ApproximateUnit = 'piece' | 'bunch' | 'pinch';
export type UnitConversions = Partial<Record<ApproximateUnit, { amount: number; unit: 'g' | 'ml' }>>;

/** Product classes are internal nodes; purchasable products are leaves. */
export interface CatalogNode {
  id: string;
  parentId: string | null;
  kind: CatalogKind;
  name: string;
  brand: string | null;
  barcodes: string[];
  saleKind: SaleKind;
  packageAmount: number | null;
  packageUnit: BaseUnit | null;
  variableUnit: BaseUnit | null;
  rawPackage: string | null;
  unitConversions: UnitConversions;
}

const categoryCollator = new Intl.Collator('de', {sensitivity: 'base'});

export function compareCatalogCategories(a: CatalogNode, b: CatalogNode): number {
  return categoryCollator.compare(a.name, b.name) || a.name.localeCompare(b.name, 'de') || a.id.localeCompare(b.id);
}

function pathFromMap(node: CatalogNode, byId: Map<string, CatalogNode>): string {
  const names: string[] = [];
  const visited = new Set<string>();
  let current: CatalogNode | undefined = node;
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    names.unshift(current.name);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return names.join(' / ');
}

export function catalogPath(node: CatalogNode, nodes: CatalogNode[]): string {
  return pathFromMap(node, new Map(nodes.map(item => [item.id, item])));
}

export function sortCatalogCategoriesByPath(categories: CatalogNode[], nodes: CatalogNode[]): CatalogNode[] {
  const byId = new Map(nodes.map(node => [node.id, node]));
  const paths = new Map(categories.map(node => [node.id, pathFromMap(node, byId)]));
  return [...categories].sort((a, b) => {
    const left = paths.get(a.id)!;
    const right = paths.get(b.id)!;
    return categoryCollator.compare(left, right) || left.localeCompare(right, 'de') || a.id.localeCompare(b.id);
  });
}

export function blankClass(id: string, name: string, parentId: string | null): CatalogNode {
  return {
    id, parentId, kind: 'class', name, brand: null, barcodes: [], saleKind: 'unknown',
    packageAmount: null, packageUnit: null, variableUnit: null, rawPackage: null, unitConversions: {}
  };
}
