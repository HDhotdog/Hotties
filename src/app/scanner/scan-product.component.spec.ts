import {provideIonicAngular} from '@ionic/angular';
import {CapacitorBarcodeScanner, CapacitorBarcodeScannerTypeHintALLOption} from '@capacitor/barcode-scanner';
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
  let scanner: jest.SpyInstance;

  const scanResult = (barcode: string) => ({ScanResult: barcode, format: CapacitorBarcodeScannerTypeHintALLOption.ALL});
  const holdNextScan = () => scanner.mockImplementation(() => new Promise(() => {
  }));

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
    scanner = jest.spyOn(CapacitorBarcodeScanner, 'scanBarcode');
  });

  afterEach(() => scanner.mockRestore());

  it('orders category choices by their full path', () => {
    const food = {...product, id: 'root-food', kind: 'class' as const, name: 'Food', parentId: null};
    const pasta = {...food, id: 'pasta', name: 'Teigwaren', parentId: food.id};
    component.nodes = [
      {...food, id: 'vegetables', name: 'Gemüse', parentId: food.id},
      {...food, id: 'bakery', name: 'Backwaren', parentId: pasta.id},
      pasta, food
    ];
    expect(component.classes.map(category => component.categoryPath(category))).toEqual([
      'Food / Gemüse', 'Food / Teigwaren', 'Food / Teigwaren / Backwaren'
    ]);
  });

  it('reopens the camera after adding an existing catalog product', async () => {
    catalog.byBarcode.mockResolvedValue(product);
    scanner.mockResolvedValueOnce(scanResult(found.barcode));
    holdNextScan();

    await component.scan();

    expect(stock.receive).toHaveBeenCalledTimes(1);
    expect(scanner).toHaveBeenCalledTimes(2);
    expect(component.savedName).toBe(found.name);
    await component.scan();
    expect(scanner).toHaveBeenCalledTimes(2);
  });

  it('reopens the camera after confirming a new scanned product', async () => {
    scanner.mockResolvedValueOnce(scanResult(found.barcode));
    holdNextScan();

    await component.scan();
    expect(component.pendingProduct).toEqual(found);
    expect(scanner).toHaveBeenCalledTimes(1);

    await component.confirmProduct();
    expect(stock.receive).toHaveBeenCalledTimes(1);
    expect(scanner).toHaveBeenCalledTimes(2);
  });

  it('reopens the camera after reviewing changed product details', async () => {
    catalog.byBarcode.mockResolvedValue(product);
    lookup.getEntry.mockResolvedValueOnce({status: 'found', fetchedAt: 1, product: found})
      .mockResolvedValueOnce({
        status: 'found', fetchedAt: Date.now(), reviewedAt: null,
        product: {...found, packageQuantity: '750 ml'}
      });
    lookup.isFresh.mockReturnValueOnce(false).mockReturnValueOnce(true);
    scanner.mockResolvedValueOnce(scanResult(found.barcode));
    holdNextScan();

    await component.scan();
    expect(component.pendingRefresh).not.toBeNull();
    expect(scanner).toHaveBeenCalledTimes(1);

    await component.confirmRefresh(false);
    expect(stock.receive).toHaveBeenCalledTimes(1);
    expect(scanner).toHaveBeenCalledTimes(2);
  });

  it('reopens the camera after confirming an internal store product', async () => {
    internalMap.get.mockResolvedValue({...product, saleKind: 'variable', variableUnit: 'g'});
    scanner.mockResolvedValueOnce(scanResult('2914374003049'));
    holdNextScan();

    await component.scan();
    expect(component.pendingInternal).not.toBeNull();
    expect(scanner).toHaveBeenCalledTimes(1);

    await component.confirmInternal();
    expect(stock.receive).toHaveBeenCalledTimes(1);
    expect(scanner).toHaveBeenCalledTimes(2);
  });

  it('keeps the last success visible when the next camera scan is closed manually', async () => {
    catalog.byBarcode.mockResolvedValue(product);
    scanner.mockResolvedValueOnce(scanResult(found.barcode))
      .mockRejectedValueOnce(new Error('Scanning cancelled'));

    await component.scan();
    await Promise.resolve();

    expect(scanner).toHaveBeenCalledTimes(2);
    expect(component.savedName).toBe(found.name);
    expect(component.errorMessage).toBeNull();
    expect(component.state).toBe('idle');
  });

  it('stops when the first camera scan is closed manually', async () => {
    scanner.mockRejectedValue(new Error('Scanning cancelled'));

    await component.scan();

    expect(scanner).toHaveBeenCalledTimes(1);
    expect(component.errorMessage).toBeNull();
  });

  it('stops and shows an error if the camera cannot open', async () => {
    scanner.mockRejectedValue(new Error('Camera unavailable'));

    await component.scan();

    expect(scanner).toHaveBeenCalledTimes(1);
    expect(component.errorMessage).toContain('Could not open the camera');
  });

  it.each(['invalid', found.barcode])('does not reopen after a failed scan of %s', async barcode => {
    if (barcode === found.barcode) lookup.lookup.mockRejectedValue(new ProductLookupError('not-found', 'Not found'));
    scanner.mockResolvedValue(scanResult(barcode));

    await component.scan();

    expect(scanner).toHaveBeenCalledTimes(1);
    expect(component.errorMessage).toBeTruthy();
  });

  it('does not reopen after the fridge save fails', async () => {
    catalog.byBarcode.mockResolvedValue(product);
    stock.receive.mockRejectedValue(new Error('Storage failed'));
    scanner.mockResolvedValue(scanResult(found.barcode));

    await component.scan();

    expect(scanner).toHaveBeenCalledTimes(1);
    expect(component.errorMessage).toBeTruthy();
  });

  it('pauses when a stale saved product is used after refresh fails', async () => {
    catalog.byBarcode.mockResolvedValue(product);
    lookup.getEntry.mockResolvedValue({status: 'found', fetchedAt: 1, product: found});
    lookup.isFresh.mockReturnValue(false);
    lookup.lookup.mockRejectedValue(new ProductLookupError('network', 'Offline'));
    scanner.mockResolvedValue(scanResult(found.barcode));

    await component.scan();

    expect(stock.receive).toHaveBeenCalledTimes(1);
    expect(component.infoMessage).toContain('saved product details');
    expect(scanner).toHaveBeenCalledTimes(1);
  });

  it('does not start the camera after a manually entered barcode is confirmed', async () => {
    await component.addBarcode(found.barcode);
    await component.confirmProduct();

    expect(stock.receive).toHaveBeenCalledTimes(1);
    expect(scanner).not.toHaveBeenCalled();
  });

  it('does not start the camera after a manually entered catalog barcode is added', async () => {
    catalog.byBarcode.mockResolvedValue(product);

    await component.addBarcode(found.barcode);

    expect(stock.receive).toHaveBeenCalledTimes(1);
    expect(scanner).not.toHaveBeenCalled();
  });

  it('does not reopen after canceling a product review', async () => {
    scanner.mockResolvedValue(scanResult(found.barcode));

    await component.scan();
    component.clearPending();

    expect(scanner).toHaveBeenCalledTimes(1);
    expect(stock.receive).not.toHaveBeenCalled();
  });

  it('ignores a late camera result after leaving the page', async () => {
    let finishScan!: (result: ReturnType<typeof scanResult>) => void;
    scanner.mockImplementation(() => new Promise(resolve => {
      finishScan = resolve;
    }));

    const scan = component.scan();
    component.ionViewWillLeave();
    finishScan(scanResult(found.barcode));
    await scan;

    expect(stock.receive).not.toHaveBeenCalled();
    expect(scanner).toHaveBeenCalledTimes(1);
  });

  it('does not reopen after leaving while a product is being saved', async () => {
    catalog.byBarcode.mockResolvedValue(product);
    scanner.mockResolvedValue(scanResult(found.barcode));
    let finishSave!: (value: { id: string }) => void;
    let saveStarted!: () => void;
    const started = new Promise<void>(resolve => {
      saveStarted = resolve;
    });
    stock.receive.mockImplementation(() => {
      saveStarted();
      return new Promise(resolve => {
        finishSave = resolve;
      });
    });

    const scan = component.scan();
    await started;
    component.ionViewWillLeave();
    finishSave({id: 'lot'});
    await scan;

    expect(scanner).toHaveBeenCalledTimes(1);
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
    const zucchini: CatalogNode = {
      ...product, id: 'zucchini', name: 'Zucchini', barcodes: [],
      saleKind: 'variable', packageAmount: null, packageUnit: null, variableUnit: 'g'
    };
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
    const zucchini: CatalogNode = {
      ...product, id: 'zucchini', name: 'Zucchini', barcodes: [],
      saleKind: 'variable', packageAmount: null, packageUnit: null, variableUnit: 'g'
    };
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
    const tomatoes: CatalogNode = {
      ...product, id: 'tomatoes', name: 'Tomatoes', barcodes: [],
      saleKind: 'variable', packageAmount: null, packageUnit: null, variableUnit: 'g'
    };
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
    const zucchini: CatalogNode = {
      ...product, id: 'zucchini', name: 'Zucchini', barcodes: [],
      saleKind: 'variable', packageAmount: null, packageUnit: null, variableUnit: 'g'
    };
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
      .mockResolvedValueOnce({
        status: 'found', fetchedAt: Date.now(), reviewedAt: null,
        product: {...found, packageQuantity: '750 ml'}
      });
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
