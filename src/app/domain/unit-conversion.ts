import {CatalogNode, UnitConversions} from './catalog.model';
import {BaseQuantity, BaseUnit} from './quantity';

const approximateUnits = new Set<BaseUnit>(['piece', 'bunch', 'pinch']);

/** Resolve each unit from the closest node in a product's category ancestry. */
export function effectiveConversions(product: CatalogNode, nodes: CatalogNode[]): UnitConversions {
  const chain: CatalogNode[] = [];
  const seen = new Set<string>();
  let current: CatalogNode | undefined = product;
  while (current && !seen.has(current.id)) {
    chain.unshift(current);
    seen.add(current.id);
    current = nodes.find(node => node.id === current?.parentId);
  }
  return Object.assign({}, ...chain.map(node => node.unitConversions ?? {}));
}

/** Returns null when the product has no safe path between the units. */
export function convertQuantity(quantity: BaseQuantity, toUnit: BaseUnit,
                                conversions: UnitConversions): number | null {
  if (quantity.unit === toUnit) return quantity.amount;
  if (quantity.unit === 'package' || toUnit === 'package') return null;
  const source = approximateUnits.has(quantity.unit)
    ? conversions[quantity.unit as keyof UnitConversions] : {amount: 1, unit: quantity.unit};
  const target = approximateUnits.has(toUnit)
    ? conversions[toUnit as keyof UnitConversions] : {amount: 1, unit: toUnit};
  if (!source || !target || source.unit !== target.unit) return null;
  return quantity.amount * source.amount / target.amount;
}
