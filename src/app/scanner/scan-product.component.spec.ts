import { provideIonicAngular } from '@ionic/angular';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { FridgeService } from '../fridge/fridge.service';
import { ItemService } from '../item/item.service';
import { AmountUnit } from '../shared/amount-unit.enum';
import { ItemType } from '../todo/item-type.enum';
import { OpenFoodFactsService, ProductLookupError } from './open-food-facts.service';
import { ScanProductComponent } from './scan-product.component';

describe('ScanProductComponent', () => {
  const product = {barcode: '1234567890123', name: 'Oat milk', brand: 'Oatly', packageQuantity: '1 l'};
  const item = {id: 'item-1', price: null, unit: AmountUnit.PACKAGE, amount: 1,
    type: ItemType.FOOD, ...product};
  let component: ScanProductComponent;
  let products: {getProduct: jest.Mock};
  let items: {findByBarcode: jest.Mock; saveScannedProduct: jest.Mock};
  let fridge: {save: jest.Mock};

  beforeEach(async () => {
    products = {getProduct: jest.fn().mockResolvedValue(product)};
    items = {findByBarcode: jest.fn().mockReturnValue(of(null)), saveScannedProduct: jest.fn().mockReturnValue(of(item))};
    fridge = {save: jest.fn().mockReturnValue(of({id: 'fridge-1', name: item.name, amount: item.unit, quantity: 1, expiryDate: null}))};
    await TestBed.configureTestingModule({
      imports: [ScanProductComponent],
      providers: [
        provideIonicAngular(),
        {provide: Router, useValue: {navigate: jest.fn()}},
        {provide: OpenFoodFactsService, useValue: products},
        {provide: ItemService, useValue: items},
        {provide: FridgeService, useValue: fridge},
      ],
    }).compileComponents();
    component = TestBed.createComponent(ScanProductComponent).componentInstance;
  });

  it('stores a new scanned product in items and adds a linked fridge row', async () => {
    await component.addBarcode(product.barcode);

    expect(products.getProduct).toHaveBeenCalledWith(product.barcode);
    expect(items.saveScannedProduct).toHaveBeenCalledWith(product);
    expect(fridge.save).toHaveBeenCalledWith(expect.objectContaining({
      itemId: item.id, name: item.name, quantity: 1, expiryDate: null,
    }));
    expect(component.savedName).toBe(item.name);
  });

  it('uses a locally cached item without another API request', async () => {
    items.findByBarcode.mockReturnValue(of(item));
    await component.addBarcode(product.barcode);

    expect(products.getProduct).not.toHaveBeenCalled();
    expect(fridge.save).toHaveBeenCalled();
  });

  it('does not create a fridge row when the lookup fails', async () => {
    products.getProduct.mockRejectedValue(new ProductLookupError('not-found', 'Not found'));
    await component.addBarcode(product.barcode);

    expect(fridge.save).not.toHaveBeenCalled();
    expect(component.errorMessage).toBe('Not found');
  });
});
