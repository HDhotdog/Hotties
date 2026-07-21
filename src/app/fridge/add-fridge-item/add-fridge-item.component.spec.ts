import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { AddFridgeItemComponent } from './add-fridge-item.component';
import { FridgeService } from '../fridge.service';
import { AmountUnit } from '../../shared/amount-unit.enum';

describe('AddFridgeItemComponent', () => {
  let component: AddFridgeItemComponent;
  let fixture: ComponentFixture<AddFridgeItemComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [AddFridgeItemComponent, IonicModule.forRoot()],
      providers: [
        { provide: FridgeService, useValue: { findById: () => of(undefined), save: () => of(undefined) } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null } } } },
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

  describe('date picker', () => {
    const change = (value: number) => ({ detail: { value } }) as CustomEvent<{ value: number }>;

    it('offers 12 months and a range of years spanning past/future', () => {
      expect(component.monthOptions).toHaveLength(12);
      expect(component.monthOptions[0]).toEqual({ value: 1, label: 'Jan' });
      expect(component.monthOptions[11]).toEqual({ value: 12, label: 'Dez' });
      expect(component.yearOptions.length).toBeGreaterThan(1);
    });

    it('offers 31 days for a 31-day month', () => {
      component.onPickerMonthChange(change(1)); // January

      expect(component.dayOptions).toHaveLength(31);
    });

    it('offers 28 days for February in a non-leap year', () => {
      component.onPickerYearChange(change(2025));
      component.onPickerMonthChange(change(2));

      expect(component.dayOptions).toHaveLength(28);
    });

    it('offers 29 days for February in a leap year', () => {
      component.onPickerYearChange(change(2024));
      component.onPickerMonthChange(change(2));

      expect(component.dayOptions).toHaveLength(29);
    });

    it('clamps the selected day down when switching to a shorter month', () => {
      component.onPickerMonthChange(change(1)); // January (31 days)
      component.onPickerDayChange(change(31));

      component.onPickerMonthChange(change(4)); // April (30 days)

      expect(component.pickerDay).toBe(30);
    });

    it('confirmDatePicker() builds an ISO date string from the picker columns', () => {
      component.onPickerYearChange(change(2026));
      component.onPickerMonthChange(change(3));
      component.onPickerDayChange(change(5));

      component.confirmDatePicker();

      expect(component.expiryDate).toBe('2026-03-05');
    });

    it('initDatePicker() seeds the columns from the currently set expiry date', () => {
      component.expiryDate = '2027-11-20';

      component.initDatePicker();

      expect(component.pickerYear).toBe(2027);
      expect(component.pickerMonth).toBe(11);
      expect(component.pickerDay).toBe(20);
    });
  });
});
