import {BaseUnit} from './quantity';

export type CatalogKind = 'class' | 'product';
export type SaleKind = 'fixed' | 'variable' | 'unknown';
export type ApproximateUnit = 'piece' | 'bunch' | 'pinch';
export type UnitConversions = Partial<Record<ApproximateUnit, {amount: number; unit: 'g' | 'ml'}>>;

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

export function blankClass(id: string, name: string, parentId: string | null): CatalogNode {
  return {
    id, parentId, kind: 'class', name, brand: null, barcodes: [], saleKind: 'unknown',
    packageAmount: null, packageUnit: null, variableUnit: null, rawPackage: null, unitConversions: {}
  };
}
