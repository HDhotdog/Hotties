import {blankClass, CatalogNode} from './catalog.model';
import {foodCategoryCandidates} from './category-candidates';

describe('local food category candidates', () => {
  it('ranks arbitrary food categories using their names and existing products', () => {
    const bakery = blankClass('bakery', 'Backwaren', 'root-food');
    const household = blankClass('cleaning', 'Reinigung', 'root-household');
    const croissant: CatalogNode = {
      id: 'croissant', parentId: 'bakery', kind: 'product', name: 'Croissant', brand: null,
      barcodes: [], saleKind: 'fixed', packageAmount: 1, packageUnit: 'piece',
      variableUnit: null, rawPackage: null
    };
    expect(foodCategoryCandidates([
      blankClass('root-food', 'Food', null), blankClass('root-household', 'Household', null),
      bakery, household, croissant
    ])).toEqual([{id: 'bakery', labels: ['Backwaren', 'Croissant']}]);
  });
});
