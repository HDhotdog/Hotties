import {TestBed} from '@angular/core/testing';
import {ChangeDetectorRef} from '@angular/core';
import {Router} from '@angular/router';
import {MenuController} from '@ionic/angular';
import {CatalogService} from './catalog.service';
import {blankClass, CatalogNode} from './catalog.model';
import {ShoppingService} from './shopping.service';
import {StockService} from './stock.service';
import {CategoryService} from '../category/category.service';
import {ShoppingPageComponent} from './shopping-page.component';
import {StockPageComponent} from './stock-page.component';

describe('Quick add pages', () => {
  const milkClass = blankClass('milk', 'Milk', 'root-food');
  const carton: CatalogNode = {
    id: 'carton', parentId: milkClass.id, kind: 'product', name: 'Milk',
    brand: 'Dairy', barcodes: [], saleKind: 'fixed', packageAmount: 1000, packageUnit: 'ml',
    variableUnit: null, rawPackage: null
  };
  const loose: CatalogNode = {
    id: 'apples', parentId: 'fruit', kind: 'product', name: 'Apples',
    brand: null, barcodes: [], saleKind: 'variable', packageAmount: null, packageUnit: null,
    variableUnit: 'g', rawPackage: null
  };
  let catalog: { findOrCreateClass: jest.Mock; save: jest.Mock; all: jest.Mock };
  let shopping: { addProduct: jest.Mock; addTask: jest.Mock };
  let stock: { receive: jest.Mock; suggestedPackages: jest.Mock };

  beforeEach(() => {
    catalog = {
      findOrCreateClass: jest.fn().mockResolvedValue(milkClass),
      save: jest.fn().mockResolvedValue(undefined), all: jest.fn().mockResolvedValue([milkClass, carton, loose])
    };
    shopping = {addProduct: jest.fn().mockResolvedValue({}), addTask: jest.fn().mockResolvedValue({})};
    stock = {receive: jest.fn().mockResolvedValue({}), suggestedPackages: jest.fn().mockReturnValue(1)};
    TestBed.configureTestingModule({
      providers: [
        {provide: Router, useValue: {navigate: jest.fn()}},
        {provide: MenuController, useValue: {open: jest.fn()}},
        {provide: ChangeDetectorRef, useValue: {detectChanges: jest.fn()}},
        {provide: CategoryService, useValue: {}},
        {provide: CatalogService, useValue: catalog},
        {provide: ShoppingService, useValue: shopping},
        {provide: StockService, useValue: stock},
      ]
    });
  });

  it('adds a typed class to shopping in one step', async () => {
    const page = TestBed.runInInjectionContext(() => new ShoppingPageComponent());
    page.selectedListId = 'list';
    page.nodes = [milkClass, carton];
    page.inputChanged('Milk');
    await page.add();
    expect(shopping.addProduct).toHaveBeenCalledWith('list', milkClass.id, {kind: 'unspecified'});
    expect(page.newName).toBe('');
  });

  it('adds an exact product as one package, with measured amount available in options', async () => {
    const page = TestBed.runInInjectionContext(() => new ShoppingPageComponent());
    page.selectedListId = 'list';
    page.nodes = [milkClass, carton];
    page.inputChanged('Milk');
    page.selectedNodeId = carton.id;
    await page.add();
    expect(shopping.addProduct).toHaveBeenCalledWith('list', carton.id, {kind: 'packages', count: 1});

    page.detailsOpen = true;
    page.selectedNodeId = carton.id;
    page.newName = 'Milk';
    page.needKind = 'quantity';
    page.needAmount = 200;
    page.needUnit = 'ml';
    await page.add();
    expect(shopping.addProduct).toHaveBeenLastCalledWith('list', carton.id,
      {kind: 'quantity', quantity: {amount: 200, unit: 'ml'}});
  });

  it('adds a fixed product to stock with one package', async () => {
    const page = TestBed.runInInjectionContext(() => new StockPageComponent());
    page.nodes = [milkClass, carton];
    page.inputChanged('Milk');
    await page.addQuick(carton);
    expect(stock.receive).toHaveBeenCalledWith(carton.id, {packages: 1, bulkQuantity: undefined, expiryDate: null});
    expect(page.quickName).toBe('');
  });

  it('asks for the amount of a variable product before adding stock', async () => {
    const page = TestBed.runInInjectionContext(() => new StockPageComponent());
    page.nodes = [loose];
    page.quickName = 'Apples';
    await page.addQuick(loose);
    expect(page.detailsOpen).toBe(true);
    expect(stock.receive).not.toHaveBeenCalled();
    page.bulkAmount = 550;
    await page.addQuick(loose);
    expect(stock.receive).toHaveBeenCalledWith(loose.id,
      {packages: 1, bulkQuantity: {amount: 550, unit: 'g'}, expiryDate: null});
  });
});
