import {provideIonicAngular} from '@ionic/angular';
import {ComponentFixture, TestBed, waitForAsync} from '@angular/core/testing';
import {ActivatedRoute} from '@angular/router';
import {of} from 'rxjs';
import {AddFridgeItemComponent} from './add-fridge-item.component';
import {FridgeService} from '../fridge.service';
import {ItemService} from '../../item/item.service';
import {AmountUnit} from '../../shared/amount-unit.enum';

describe('AddFridgeItemComponent', () => {
  let component: AddFridgeItemComponent;
  let fixture: ComponentFixture<AddFridgeItemComponent>;
  let saveSpy: jest.Mock;

  beforeEach(waitForAsync(() => {
    saveSpy = jest.fn(() => of(undefined));

    TestBed.configureTestingModule({
      imports: [AddFridgeItemComponent],
      providers: [
        provideIonicAngular(),
        {provide: FridgeService, useValue: {findById: () => of(undefined), save: saveSpy}},
        {provide: ItemService, useValue: {findAll: () => of([])}},
        {provide: ActivatedRoute, useValue: {snapshot: {paramMap: {get: () => null}}}},
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AddFridgeItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('defaults quantity to 1 for a new item', () => {
    expect(component.quantity).toBe(1);
  });

  it('incrementQuantity() increases the quantity by 1', () => {
    component.incrementQuantity();

    expect(component.quantity).toBe(2);
  });

  it('decrementQuantity() decreases the quantity by 1', () => {
    component.quantity = 5;

    component.decrementQuantity();

    expect(component.quantity).toBe(4);
  });

  it('does not let quantity drop below 0', () => {
    component.quantity = 0;

    component.decrementQuantity();

    expect(component.quantity).toBe(0);
  });

  it('does not let quantity exceed 999', () => {
    component.quantity = 999;

    component.incrementQuantity();

    expect(component.quantity).toBe(999);
  });

  it('inputChanged() is true once quantity differs from the loaded item', () => {
    expect(component.inputChanged()).toBe(false);

    component.incrementQuantity();

    expect(component.inputChanged()).toBe(true);
  });

  describe('new item (no autosave while typing)', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('starts out saved', () => {
      expect(component.saveStatus).toBe('saved');
    });

    it('flips to unsaved immediately on a change', () => {
      component.name = 'Butter';

      expect(component.saveStatus).toBe('unsaved');
      expect(saveSpy).not.toHaveBeenCalled();
    });

    it('does not save automatically while typing, even after the old debounce delay', () => {
      component.name = 'Butter';
      jest.advanceTimersByTime(500);

      expect(saveSpy).not.toHaveBeenCalled();
    });

    it('does not save automatically on a quantity change either', () => {
      component.incrementQuantity();
      jest.advanceTimersByTime(500);

      expect(saveSpy).not.toHaveBeenCalled();
    });

    it('navigateBack() saves the new item once something has changed', () => {
      component.name = 'Butter';

      component.navigateBack();

      expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({name: 'Butter'}));
    });

    it('navigateBack() does not save an untouched new item', () => {
      component.navigateBack();

      expect(saveSpy).not.toHaveBeenCalled();
    });

    it('briefly pulses when the save status changes', () => {
      component.name = 'Butter';
      expect(component.savePulse).toBe(true);

      jest.advanceTimersByTime(300);

      expect(component.savePulse).toBe(false);
    });
  });

  describe('editing an existing item (autosave while typing)', () => {
    let editSaveSpy: jest.Mock;
    let editComponent: AddFridgeItemComponent;
    let editFixture: ComponentFixture<AddFridgeItemComponent>;

    const existingItem = {
      id: 'f1', name: 'Milk', amount: AmountUnit.LITER, quantity: 1, expiryDate: null,
    };

    beforeEach(waitForAsync(() => {
      TestBed.resetTestingModule();
      editSaveSpy = jest.fn(() => of(undefined));

      TestBed.configureTestingModule({
        imports: [AddFridgeItemComponent],
        providers: [
          provideIonicAngular(),
          {provide: FridgeService, useValue: {findById: () => of(existingItem), save: editSaveSpy}},
          {provide: ItemService, useValue: {findAll: () => of([])}},
          {provide: ActivatedRoute, useValue: {snapshot: {paramMap: {get: () => 'f1'}}}},
        ],
      }).compileComponents();

      editFixture = TestBed.createComponent(AddFridgeItemComponent);
      editComponent = editFixture.componentInstance;
      editFixture.detectChanges();
    }));

    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('saves automatically 500ms after the last change', () => {
      editComponent.name = 'Butter';
      jest.advanceTimersByTime(500);

      expect(editSaveSpy).toHaveBeenCalledWith(expect.objectContaining({name: 'Butter'}));
      expect(editComponent.saveStatus).toBe('saved');
    });

    it('does not save before the 500ms delay has elapsed', () => {
      editComponent.name = 'Butter';
      jest.advanceTimersByTime(499);

      expect(editSaveSpy).not.toHaveBeenCalled();
    });

    it('restarts the debounce timer on every subsequent edit', () => {
      editComponent.name = 'But';
      jest.advanceTimersByTime(300);
      editComponent.name = 'Butter';
      jest.advanceTimersByTime(300);

      expect(editSaveSpy).not.toHaveBeenCalled();

      jest.advanceTimersByTime(200);

      expect(editSaveSpy).toHaveBeenCalledTimes(1);
      expect(editSaveSpy).toHaveBeenCalledWith(expect.objectContaining({name: 'Butter'}));
    });

    it('quantity changes trigger the same autosave debounce', () => {
      editComponent.incrementQuantity();
      jest.advanceTimersByTime(500);

      expect(editSaveSpy).toHaveBeenCalledWith(expect.objectContaining({quantity: 2}));
    });

    it('navigateBack() flushes a pending save immediately instead of waiting', () => {
      editComponent.name = 'Butter';

      editComponent.navigateBack();

      expect(editSaveSpy).toHaveBeenCalledWith(expect.objectContaining({name: 'Butter'}));
    });

    it('does not call save again on navigateBack() if nothing is pending', () => {
      editComponent.navigateBack();

      expect(editSaveSpy).not.toHaveBeenCalled();
    });
  });
});
