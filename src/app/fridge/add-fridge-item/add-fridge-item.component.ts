import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { FridgeItem } from '../models/fridge-item.dto';
import { FridgeService } from '../fridge.service';
import { AmountUnit } from '../../shared/amount-unit.enum';
import { v4 as uuidv4 } from 'uuid';

const MIN_QUANTITY = 0;
const MAX_QUANTITY = 999;
const YEARS_BEFORE_TODAY = 1;
const YEARS_AFTER_TODAY = 5;

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun',
  'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez',
];

export interface PickerOption<T> {
  value: T;
  label: string;
}

@Component({
  selector: 'app-add-fridge-item',
  templateUrl: './add-fridge-item.component.html',
  styleUrls: ['./add-fridge-item.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [CommonModule, IonicModule, FormsModule, RouterModule],
})
export class AddFridgeItemComponent implements OnInit {
  private router = inject(Router);
  private fridgeService = inject(FridgeService);
  private route = inject(ActivatedRoute);

  public readonly amountUnits = Object.values(AmountUnit);
  public readonly monthOptions: PickerOption<number>[] = MONTH_NAMES.map((label, index) => ({
    value: index + 1,
    label,
  }));
  public readonly yearOptions: number[];

  private _name: string = '';
  private _amount: AmountUnit = AmountUnit.PIECE;
  private _quantity: number = 1;
  private _expiryDate: string | null = null;
  private _item: FridgeItem = {} as FridgeItem;

  private _dayOptions: number[] = [];
  private _pickerDay: number;
  private _pickerMonth: number;
  private _pickerYear: number;

  constructor() {
    const today = new Date();
    const currentYear = today.getFullYear();
    this.yearOptions = Array.from(
      { length: YEARS_BEFORE_TODAY + YEARS_AFTER_TODAY + 1 },
      (_, i) => currentYear - YEARS_BEFORE_TODAY + i
    );
    this._pickerDay = today.getDate();
    this._pickerMonth = today.getMonth() + 1;
    this._pickerYear = currentYear;
    this.refreshDayOptions();
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.fridgeService.findById(id).subscribe((item) => {
        this._item = item;
        this._name = item.name;
        this._amount = item.amount;
        this._quantity = item.quantity;
        this._expiryDate = item.expiryDate;
      });
    } else {
      this._item = {
        id: uuidv4(),
        name: this._name,
        amount: this._amount,
        quantity: this._quantity,
        expiryDate: this._expiryDate,
      };
    }
  }

  public navigateBack(): void {
    void this.router.navigate(['/tabs/fridge']);
  }

  public saveItem(): void {
    const item: FridgeItem = {
      id: this._item.id,
      name: this._name,
      amount: this._amount,
      quantity: this._quantity,
      expiryDate: this._expiryDate,
    };
    this.fridgeService.save(item).subscribe(() => this.navigateBack());
  }

  public clearExpiryDate(): void {
    this._expiryDate = null;
  }

  public incrementQuantity(): void {
    this.quantity = this._quantity + 1;
  }

  public decrementQuantity(): void {
    this.quantity = this._quantity - 1;
  }

  public inputChanged(): boolean {
    return (
      this._item.name !== this._name ||
      this._item.amount !== this._amount ||
      this._item.quantity !== this._quantity ||
      (this._item.expiryDate ?? null) !== this._expiryDate
    );
  }

  /** Seeds the picker columns from the current expiry date (or today, if unset). Call right before the picker opens. */
  public initDatePicker(): void {
    const base = this._expiryDate ? new Date(this._expiryDate) : new Date();
    this._pickerDay = base.getDate();
    this._pickerMonth = base.getMonth() + 1;
    this._pickerYear = base.getFullYear();
    this.refreshDayOptions();
  }

  public onPickerDayChange(event: any): void {
    this._pickerDay = Number(event.detail.value);
  }

  public onPickerMonthChange(event: any): void {
    this._pickerMonth = Number(event.detail.value);
    this.refreshDayOptions();
  }

  public onPickerYearChange(event: any): void {
    this._pickerYear = Number(event.detail.value);
    this.refreshDayOptions();
  }

  public confirmDatePicker(): void {
    const mm = String(this._pickerMonth).padStart(2, '0');
    const dd = String(this._pickerDay).padStart(2, '0');
    this._expiryDate = `${this._pickerYear}-${mm}-${dd}`;
  }

  private refreshDayOptions(): void {
    const daysInMonth = new Date(this._pickerYear, this._pickerMonth, 0).getDate();
    this._dayOptions = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    if (this._pickerDay > daysInMonth) {
      this._pickerDay = daysInMonth;
    }
  }

  get dayOptions(): number[] {
    return this._dayOptions;
  }

  get pickerDay(): number {
    return this._pickerDay;
  }

  get pickerMonth(): number {
    return this._pickerMonth;
  }

  get pickerYear(): number {
    return this._pickerYear;
  }

  get name(): string {
    return this._name;
  }

  set name(name: string) {
    this._name = name;
  }

  get amount(): AmountUnit {
    return this._amount;
  }

  set amount(amount: AmountUnit) {
    this._amount = amount;
  }

  get quantity(): number {
    return this._quantity;
  }

  set quantity(quantity: number) {
    this._quantity = Math.min(MAX_QUANTITY, Math.max(MIN_QUANTITY, Math.trunc(quantity) || 0));
  }

  get expiryDate(): string | null {
    return this._expiryDate;
  }

  set expiryDate(expiryDate: string | null) {
    this._expiryDate = expiryDate;
  }
}
