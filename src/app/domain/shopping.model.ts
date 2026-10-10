import {BaseUnit} from './quantity';

export type NeedKind = 'quantity' | 'packages' | 'unspecified';

export interface ShoppingEntry {
  id: string;
  shoppingListId: string;
  kind: 'product' | 'task';
  targetNodeId?: string | null;
  label?: string;
  needKind: NeedKind;
  needAmount: number | null;
  needUnit: BaseUnit | null;
  checked: boolean;
  createdAt: number;
  /** Purchase allocations retained after their stock lot has been consumed. */
  retiredAllocations: RetiredAllocation[];
}

export interface RetiredAllocation {
  lotId: string;
  amount: number;
  unit: BaseUnit;
}

export interface ScanAllocation {
  shoppingEntryId: string;
  amount: number;
  unit: BaseUnit;
}

export interface StockLot {
  id: string;
  productId: string;
  acquiredPackages: number;
  acquiredAmount: number;
  acquiredUnit: BaseUnit;
  remainingAmount: number;
  expiryDate: string | null;
  allocations: ScanAllocation[];
  createdAt: number;
}
