import {provideIonicAngular} from '@ionic/angular';
import {TestBed} from '@angular/core/testing';
import {ActivatedRoute, convertToParamMap, Router} from '@angular/router';
import {of} from 'rxjs';
import {CatalogService} from '../domain/catalog.service';
import {StockService} from '../domain/stock.service';
import {CategoryService} from '../category/category.service';
import {ProductLookupError} from './open-food-facts.service';
import {OffProductCacheService} from './off-product-cache.service';
import {InternalProductMapService} from './internal-product-map.service';
import {ScanProductComponent} from './scan-product.component';
import {CatalogNode} from '../domain/catalog.model';

describe('ScanProductComponent', () => {
  const found = {barcode: '1234567890123', name: 'Oat milk', brand: 'Brand', packageQuantity: '1 l'};
  const product: CatalogNode = {
    id: 'product',
    parentId: 'milk',
    kind: 'product',
    name: found.name,
    brand: found.brand,
    barcodes: [found.barcode],
    saleKind: 'fixed',
    packageAmount: 1000,
    packageUnit: 'ml',
    variableUnit: null,
    rawPackage: found.packageQuantity, unitConversions: {}
  };
  let component: ScanProductComponent;
  let lookup: { lookup: jest.Mock; getEntry: jest.Mock; isFresh: jest.Mock; markReviewed: jest.Mock };
  let internalMap: { get: jest.Mock; save: jest.Mock };
  let catalog: {
    observe: jest.Mock;
    byBarcode: jest.Mock;
    byId: jest.Mock;
    suggestedClass: jest.Mock;
    productDraft: jest.Mock;
    createLooseDraft: jest.Mock;
    save: jest.Mock;
    findOrCreateClass: jest.Mock
  };
  let stock: { receive: jest.Mock };

  beforeEach(async () => {
    lookup = {
      lookup: jest.fn().mockResolvedValue(found), getEntry: jest.fn().mockResolvedValue(null),
      isFresh: jest.fn().mockReturnValue(true), markReviewed: jest.fn().mockResolvedValue(undefined)
    };
    internalMap = {get: jest.fn().mockResolvedValue(null), save: jest.fn().mockResolvedValue(undefined)};
    catalog = {
      observe: jest.fn().mockReturnValue(of([])), byBarcode: jest.fn().mockResolvedValue(null),
      byId: jest.fn().mockResolvedValue(product),
      suggestedClass: jest.fn().mockReturnValue(null), productDraft: jest.fn().mockReturnValue(product),
      createLooseDraft: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined), findOrCreateClass: jest.fn().mockResolvedValue({id: 'milk'})
    };
    stock = {receive: jest.fn().mockResolvedValue({id: 'lot'})};
    await TestBed.configureTestingModule({
      imports: [ScanProductComponent], providers: [
        provideIonicAngular(), {provide: Router, useValue: {navigate: jest.fn()}},
        {provide: ActivatedRoute, useValue: {snapshot: {queryParamMap: convertToParamMap({})}}},
        {provide: OffProductCacheService, useValue: lookup},
        {provide: InternalProductMapService, useValue: internalMap},
        {provide: CatalogService, useValue: catalog},
        {provide: StockService, useValue: stock}, {
          provide: CategoryService,
          useValue: {getSelectedCategoryId: () => of('list'), getCategories: () => of([{id: 'list', name: 'Edeka'}])}
        },
      ]
    }).compileComponents();
    component = TestBed.createComponent(ScanProductComponent).componentInstance;
  });

  it('confirms a new product before adding stock', async () => {
    await component.addBarcode(found.barcode);
    expect(component.pendingProduct).toEqual(found);
    expect(stock.receive).not.toHaveBeenCalled();
    component.selectedClassId = 'milk';
    await component.confirmProduct();
    expect(catalog.save).toHaveBeenCalledWith(product);
    expect(stock.receive).toHaveBeenCalledWith(product.id, expect.objectContaining({
      shoppingListId: 'list',
      scanId: expect.any(String)
    }));
    expect(component.savedName).toBe(found.name);
  });

  it('uses the product name as a category for a one-tap new barcode confirmation', async () => {
    await component.addBarcode(found.barcode);
    await component.confirmProduct();
    expect(catalog.findOrCreateClass).toHaveBeenCalledWith(found.name);
    expect(stock.receive).toHaveBeenCalledWith(product.id, expect.objectContaining({scanId: expect.any(String)}));
  });

  it('uses a locally saved product without another lookup', async () => {
    catalog.byBarcode.mockResolvedValue(product);
    await component.addBarcode(found.barcode);
    expect(lookup.lookup).not.toHaveBeenCalled();
    expect(stock.receive).toHaveBeenCalledWith(product.id, expect.objectContaining({
      shoppingListId: 'list',
      scanId: expect.any(String)
    }));
  });

  it('does not create stock when lookup fails', async () => {
    lookup.lookup.mockRejectedValue(new ProductLookupError('not-found', 'Not found'));
    await component.addBarcode(found.barcode);
    expect(stock.receive).not.toHaveBeenCalled();
    expect(component.errorMessage).toBe('Not found');
  });

  it.each(['2012345678901', '2812345678901', '2914374003048', '2914374000000', '2914374'])
  ('never looks up an internal barcode that cannot be decoded', async barcode => {
    await component.addBarcode(barcode);
    expect(lookup.lookup).not.toHaveBeenCalled();
    expect(stock.receive).not.toHaveBeenCalled();
    expect(component.errorMessage).toBeTruthy();
  });

  it('maps an unknown weighed product and receives its exact grams', async () => {
    const zucchini: CatalogNode = {...product, id: 'zucchini', name: 'Zucchini', barcodes: [],
      saleKind: 'variable', packageAmount: null, packageUnit: null, variableUnit: 'g'};
    catalog.byId.mockResolvedValue(zucchini);
    component.nodes = [zucchini];
    await component.addBarcode('2914374003049');
    expect(component.pendingInternal).toEqual({productCode: '14374', grams: 304});
    expect(component.mappingMode).toBe(true);
    component.selectedInternalProductId = zucchini.id;
    await component.confirmInternal();
    expect(internalMap.save).toHaveBeenCalledWith('list', '14374', zucchini.id);
    expect(stock.receive).toHaveBeenCalledWith(zucchini.id, expect.objectContaining({
      shoppingListId: 'list', bulkQuantity: {amount: 304, unit: 'g'}
    }));
    expect(lookup.lookup).not.toHaveBeenCalled();
  });

  it('creates a new weighed product before saving its store mapping', async () => {
    const zucchini: CatalogNode = {...product, id: 'zucchini', name: 'Zucchini', barcodes: [],
      saleKind: 'variable', packageAmount: null, packageUnit: null, variableUnit: 'g'};
    catalog.createLooseDraft.mockReturnValue(zucchini);
    await component.addBarcode('2914374003049');
    component.internalName = 'Zucchini';
    await component.confirmInternal();
    expect(catalog.findOrCreateClass).toHaveBeenCalledWith('Zucchini');
    expect(catalog.createLooseDraft).toHaveBeenCalledWith('Zucchini', 'milk', 'g');
    expect(catalog.save).toHaveBeenCalledWith(zucchini);
    expect(internalMap.save).toHaveBeenCalledWith('list', '14374', zucchini.id);
    expect(stock.receive).toHaveBeenCalledWith(zucchini.id, expect.objectContaining({
      bulkQuantity: {amount: 304, unit: 'g'}
    }));
  });

  it('reuses a store mapping for a different weight without an OFF request', async () => {
    const tomatoes: CatalogNode = {...product, id: 'tomatoes', name: 'Tomatoes', barcodes: [],
      saleKind: 'variable', packageAmount: null, packageUnit: null, variableUnit: 'g'};
    internalMap.get.mockResolvedValue(tomatoes);
    await component.addBarcode('2917369006841');
    expect(internalMap.get).toHaveBeenCalledWith('list', '17369');
    await component.confirmInternal();
    expect(stock.receive).toHaveBeenCalledWith(tomatoes.id, expect.objectContaining({
      bulkQuantity: {amount: 684, unit: 'g'}
    }));
    expect(lookup.lookup).not.toHaveBeenCalled();
  });

  it('asks for the store when a weighed code is scanned from the fridge', async () => {
    (TestBed.inject(ActivatedRoute).snapshot as any).queryParamMap = convertToParamMap({from: 'fridge'});
    await component.addBarcode('2914374003049');
    expect(component.selectedStoreId).toBe('');
    expect(internalMap.get).not.toHaveBeenCalled();
    component.selectedStoreId = 'list';
    await component.selectInternalStore();
    expect(internalMap.get).toHaveBeenCalledWith('list', '14374');
    expect(lookup.lookup).not.toHaveBeenCalled();
  });

  it('allows correcting a known store mapping before adding stock', async () => {
    const zucchini: CatalogNode = {...product, id: 'zucchini', name: 'Zucchini', barcodes: [],
      saleKind: 'variable', packageAmount: null, packageUnit: null, variableUnit: 'g'};
    const tomatoes = {...zucchini, id: 'tomatoes', name: 'Tomatoes'};
    internalMap.get.mockResolvedValue(zucchini);
    catalog.byId.mockResolvedValue(tomatoes);
    await component.addBarcode('2914374003049');
    component.changeInternalProduct();
    component.selectedInternalProductId = tomatoes.id;
    await component.confirmInternal();
    expect(internalMap.save).toHaveBeenCalledWith('list', '14374', tomatoes.id);
    expect(stock.receive).toHaveBeenCalledWith(tomatoes.id, expect.objectContaining({
      bulkQuantity: {amount: 304, unit: 'g'}
    }));
  });

  it('reviews changed OFF details when a saved product cache expires', async () => {
    catalog.byBarcode.mockResolvedValue(product);
    lookup.getEntry.mockResolvedValueOnce({status: 'found', fetchedAt: 1, product: found})
      .mockResolvedValueOnce({status: 'found', fetchedAt: Date.now(), reviewedAt: null,
        product: {...found, packageQuantity: '750 ml'}});
    lookup.isFresh.mockReturnValueOnce(false).mockReturnValueOnce(true);
    await component.addBarcode(found.barcode);
    expect(component.pendingRefresh?.fresh.packageQuantity).toBe('750 ml');
    expect(stock.receive).not.toHaveBeenCalled();
    await component.confirmRefresh(false);
    expect(lookup.markReviewed).toHaveBeenCalledWith(found.barcode);
    expect(stock.receive).toHaveBeenCalledWith(product.id, expect.any(Object));
  });

  it('uses saved details when an expired OFF refresh fails', async () => {
    catalog.byBarcode.mockResolvedValue(product);
    lookup.getEntry.mockResolvedValue({status: 'found', fetchedAt: 1, product: found});
    lookup.isFresh.mockReturnValue(false);
    lookup.lookup.mockRejectedValue(new ProductLookupError('network', 'Offline'));
    await component.addBarcode(found.barcode);
    expect(stock.receive).toHaveBeenCalledWith(product.id, expect.any(Object));
    expect(component.infoMessage).toContain('saved product details');
  });

  it('applies accepted OFF package changes before receiving another lot', async () => {
    catalog.byBarcode.mockResolvedValue(product);
    const fresh = {...found, name: 'Oat drink', packageQuantity: '750 ml'};
    lookup.getEntry.mockResolvedValueOnce({status: 'found', fetchedAt: 1, product: found})
      .mockResolvedValueOnce({status: 'found', fetchedAt: Date.now(), reviewedAt: null, product: fresh});
    lookup.isFresh.mockReturnValueOnce(false).mockReturnValueOnce(true);
    await component.addBarcode(found.barcode);
    await component.confirmRefresh(true);
    expect(catalog.save).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Oat drink', packageAmount: 750, packageUnit: 'ml', rawPackage: '750 ml'
    }));
    expect(stock.receive).toHaveBeenCalledWith(product.id, expect.any(Object));
  });
});
