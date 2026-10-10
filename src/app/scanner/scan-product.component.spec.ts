import {provideIonicAngular} from '@ionic/angular';
import {TestBed} from '@angular/core/testing';
import {ActivatedRoute, Router, convertToParamMap} from '@angular/router';
import {of} from 'rxjs';
import {CatalogService} from '../domain/catalog.service';
import {StockService} from '../domain/stock.service';
import {CategoryService} from '../category/category.service';
import {OpenFoodFactsService, ProductLookupError} from './open-food-facts.service';
import {ScanProductComponent} from './scan-product.component';
import {CatalogNode} from '../domain/catalog.model';

describe('ScanProductComponent', () => {
  const found = {barcode: '1234567890123', name: 'Oat milk', brand: 'Brand', packageQuantity: '1 l'};
  const product: CatalogNode = {id: 'product', parentId: 'milk', kind: 'product', name: found.name, brand: found.brand,
    barcodes: [found.barcode], saleKind: 'fixed', packageAmount: 1000, packageUnit: 'ml', variableUnit: null, rawPackage: found.packageQuantity};
  let component: ScanProductComponent;
  let lookup: {getProduct: jest.Mock};
  let catalog: {observe: jest.Mock; byBarcode: jest.Mock; suggestedClass: jest.Mock; productDraft: jest.Mock; save: jest.Mock; findOrCreateClass: jest.Mock};
  let stock: {receive: jest.Mock};

  beforeEach(async () => {
    lookup = {getProduct: jest.fn().mockResolvedValue(found)};
    catalog = {observe: jest.fn().mockReturnValue(of([])), byBarcode: jest.fn().mockResolvedValue(null),
      suggestedClass: jest.fn().mockReturnValue(null), productDraft: jest.fn().mockReturnValue(product),
      save: jest.fn().mockResolvedValue(undefined), findOrCreateClass: jest.fn().mockResolvedValue({id: 'milk'})};
    stock = {receive: jest.fn().mockResolvedValue({id: 'lot'})};
    await TestBed.configureTestingModule({imports: [ScanProductComponent], providers: [
      provideIonicAngular(), {provide: Router, useValue: {navigate: jest.fn()}},
      {provide: ActivatedRoute, useValue: {snapshot: {queryParamMap: convertToParamMap({})}}},
      {provide: OpenFoodFactsService, useValue: lookup}, {provide: CatalogService, useValue: catalog},
      {provide: StockService, useValue: stock}, {provide: CategoryService, useValue: {getSelectedCategoryId: () => of('list')}},
    ]}).compileComponents();
    component = TestBed.createComponent(ScanProductComponent).componentInstance;
  });

  it('confirms a new product before adding stock', async () => {
    await component.addBarcode(found.barcode);
    expect(component.pendingProduct).toEqual(found);
    expect(stock.receive).not.toHaveBeenCalled();
    component.selectedClassId = 'milk';
    await component.confirmProduct();
    expect(catalog.save).toHaveBeenCalledWith(product);
    expect(stock.receive).toHaveBeenCalledWith(product.id, expect.objectContaining({shoppingListId: 'list', scanId: expect.any(String)}));
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
    expect(lookup.getProduct).not.toHaveBeenCalled();
    expect(stock.receive).toHaveBeenCalledWith(product.id, expect.objectContaining({shoppingListId: 'list', scanId: expect.any(String)}));
  });

  it('does not create stock when lookup fails', async () => {
    lookup.getProduct.mockRejectedValue(new ProductLookupError('not-found', 'Not found'));
    await component.addBarcode(found.barcode);
    expect(stock.receive).not.toHaveBeenCalled();
    expect(component.errorMessage).toBe('Not found');
  });
});
