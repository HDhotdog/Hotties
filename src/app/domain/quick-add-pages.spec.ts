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
import {CategorySuggestionService} from './category-suggestion.service';

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
  let catalog: { findOrCreateClass: jest.Mock; save: jest.Mock; all: jest.Mock; byId: jest.Mock; matches: jest.Mock };
  let shopping: { addProduct: jest.Mock; addTask: jest.Mock };
  let stock: { receive: jest.Mock; suggestedPackages: jest.Mock };
  let categorySuggestions: { rank: jest.Mock };

  beforeEach(() => {
    catalog = {
      findOrCreateClass: jest.fn().mockResolvedValue(milkClass),
      save: jest.fn().mockResolvedValue(undefined), all: jest.fn().mockResolvedValue([milkClass, carton, loose]),
      byId: jest.fn(async (id: string) => [milkClass, carton, loose].find(node => node.id === id)),
      matches: jest.fn((_root: string, id: string, nodes: CatalogNode[]) =>
        nodes.find(node => node.id === id)?.parentId === 'root-food')
    };
    shopping = {addProduct: jest.fn().mockResolvedValue({}), addTask: jest.fn().mockResolvedValue({})};
    stock = {receive: jest.fn().mockResolvedValue({}), suggestedPackages: jest.fn().mockReturnValue(1)};
    categorySuggestions = {rank: jest.fn().mockResolvedValue([])};
    TestBed.configureTestingModule({
      providers: [
        {provide: Router, useValue: {navigate: jest.fn()}},
        {provide: MenuController, useValue: {open: jest.fn()}},
        {provide: ChangeDetectorRef, useValue: {detectChanges: jest.fn(), markForCheck: jest.fn()}},
        {provide: CategoryService, useValue: {}},
        {provide: CatalogService, useValue: catalog},
        {provide: ShoppingService, useValue: shopping},
        {provide: StockService, useValue: stock},
        {provide: CategorySuggestionService, useValue: categorySuggestions},
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

  it('reviews a German voice phrase and creates a one-piece product in the chosen category', async () => {
    const bakery = blankClass('bakery', 'Backwaren', 'root-food');
    categorySuggestions.rank.mockResolvedValue([bakery.id]);
    const page = TestBed.runInInjectionContext(() => new StockPageComponent());
    page.nodes = [blankClass('root-food', 'Food', null), bakery];
    await page.prepareReview('Eine Brezel');
    expect(page.review).toMatchObject({name: 'Brezel', count: 1, suggestedIds: ['bakery'], categoryId: ''});
    expect(stock.receive).not.toHaveBeenCalled();
    page.review!.categoryId = bakery.id;
    await page.confirmReview();
    expect(catalog.save).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Brezel', parentId: bakery.id, saleKind: 'fixed', packageAmount: 1, packageUnit: 'piece'
    }));
    expect(stock.receive).toHaveBeenCalledWith(expect.any(String),
      {packages: 1, bulkQuantity: undefined, expiryDate: null, scanId: expect.any(String)});
  });

  it('requires a category for any new product and allows cancellation without writes', async () => {
    const page = TestBed.runInInjectionContext(() => new StockPageComponent());
    page.nodes = [blankClass('root-food', 'Food', null)];
    await page.prepareReview('Drei Tomaten');
    expect(page.review).toMatchObject({name: 'Tomaten', count: 3});
    await page.confirmReview();
    expect(page.error).toMatch(/Choose or create a food category/);
    page.cancelReview();
    expect(catalog.save).not.toHaveBeenCalled();
    expect(stock.receive).not.toHaveBeenCalled();
  });

  it('reuses an existing product and prevents a double confirm', async () => {
    const bread: CatalogNode = {...carton, id: 'bread', name: 'Brot', parentId: milkClass.id,
      packageAmount: 1, packageUnit: 'piece'};
    catalog.byId.mockResolvedValue(bread);
    let release!: () => void;
    stock.receive.mockReturnValue(new Promise(resolve => { release = () => resolve({}); }));
    const page = TestBed.runInInjectionContext(() => new StockPageComponent());
    page.nodes = [milkClass, bread];
    await page.prepareReview('2 Brot');
    const first = page.confirmReview();
    const second = page.confirmReview();
    release();
    await Promise.all([first, second]);
    expect(catalog.save).not.toHaveBeenCalled();
    expect(stock.receive).toHaveBeenCalledTimes(1);
    expect(stock.receive).toHaveBeenCalledWith('bread',
      {packages: 2, bulkQuantity: undefined, expiryDate: null, scanId: expect.any(String)});
  });

  it('keeps the stock request ID when a save is retried', async () => {
    const bakery = blankClass('bakery', 'Backwaren', 'root-food');
    let created: CatalogNode | null = null;
    catalog.save.mockImplementation(async (node: CatalogNode) => { created = node; });
    catalog.byId.mockImplementation(async () => created);
    stock.receive.mockRejectedValueOnce(new Error('Interrupted after write')).mockResolvedValueOnce({});
    const page = TestBed.runInInjectionContext(() => new StockPageComponent());
    page.nodes = [blankClass('root-food', 'Food', null), bakery];
    await page.prepareReview('eine Brezel');
    page.review!.categoryId = bakery.id;
    await page.confirmReview();
    expect(page.review).not.toBeNull();
    await page.confirmReview();
    expect(catalog.save).toHaveBeenCalledTimes(1);
    expect(stock.receive).toHaveBeenCalledTimes(2);
    expect(stock.receive.mock.calls[0][1].scanId).toBe(stock.receive.mock.calls[1][1].scanId);
  });
});
