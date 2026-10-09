import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonModal,
  IonPicker,
  IonPickerColumn,
  IonPickerColumnOption,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FridgeItem } from '../models/fridge-item.dto';
import { FridgeService } from '../fridge.service';
import { AmountUnit } from '../../shared/amount-unit.enum';
import { v4 as uuidv4 } from 'uuid';
import { ItemAutocompleteComponent } from '../../item/item-autocomplete/item-autocomplete.component';

const MIN_QUANTITY = 0;
const MAX_QUANTITY = 999;
const YEARS_BEFORE_TODAY = 1;
const YEARS_AFTER_TODAY = 5;
const AUTO_SAVE_DELAY_MS = 500;
const SAVE_PULSE_DURATION_MS = 300;

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun',
  'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez',
];

export interface PickerOption<T> {
  value: T;
  label: string;
}

export type SaveStatus = 'saved' | 'unsaved';

@Component({
  selector: 'app-add-fridge-item',
  templateUrl: './add-fridge-item.component.html',
  styleUrls: ['./add-fridge-item.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ItemAutocompleteComponent,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonModal,
    IonPicker,
    IonPickerColumn,
    IonPickerColumnOption,
    IonSelect,
    IonSelectOption,
    IonTitle,
    IonToolbar,
  ],
})
export class AddFridgeItemComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private fridgeService = inject(FridgeService);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

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

  private _saveStatus: SaveStatus = 'saved';
  private _savePulse: boolean = false;
  private _isNew: boolean = true;
  private autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
  private pulseTimer: ReturnType<typeof setTimeout> | null = null;

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
    this._isNew = !id;
    if (id) {
      this.fridgeService.findById(id).subscribe((item) => {
        this._item = item;
        this._name = item.name;
        this._amount = item.amount;
        this._quantity = item.quantity;
        this._expiryDate = item.expiryDate;
        this.cdr.markForCheck();
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

  ngOnDestroy(): void {
    // Don't drop the last 500ms of edits if the user navigates away
    // (e.g. hardware back button) before the debounce fires.
    this.flushPendingSave();
    if (this.pulseTimer) {
      clearTimeout(this.pulseTimer);
    }
  }

  public navigateBack(): void {
    this.flushPendingSave();
    void this.router.navigate(['/tabs/fridge']);
  }

  public clearExpiryDate(): void {
    this._expiryDate = null;
    this.scheduleAutoSave();
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
    this.scheduleAutoSave();
  }

  private refreshDayOptions(): void {
    const daysInMonth = new Date(this._pickerYear, this._pickerMonth, 0).getDate();
    this._dayOptions = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    if (this._pickerDay > daysInMonth) {
      this._pickerDay = daysInMonth;
    }
  }

  /**
   * Debounces a save 500ms after the last change; restarts on every subsequent
   * edit. Only for editing an existing item - a brand-new item isn't saved
   * until the user navigates away (see flushPendingSave), so an abandoned
   * "new item" form doesn't leave a half-filled entry behind.
   */
  private scheduleAutoSave(): void {
    this.setSaveStatus('unsaved');
    if (this._isNew) {
      return;
    }
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }
    this.autoSaveTimer = setTimeout(() => {
      this.autoSaveTimer = null;
      this.persist();
    }, AUTO_SAVE_DELAY_MS);
  }

  /** Saves immediately if a debounced save is pending, skipping the wait. */
  private flushPendingSave(): void {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
      this.autoSaveTimer = null;
      this.persist();
    } else if (this._isNew && this.inputChanged()) {
      this.persist();
    }
  }

  private persist(): void {
    const item: FridgeItem = {
      id: this._item.id,
      name: this._name,
      amount: this._amount,
      quantity: this._quantity,
      expiryDate: this._expiryDate,
    };
    this.fridgeService.save(item).subscribe(() => {
      this._item = item;
      this.setSaveStatus('saved');
      this.cdr.markForCheck();
    });
  }

  private setSaveStatus(status: SaveStatus): void {
    if (this._saveStatus === status) {
      return;
    }
    this._saveStatus = status;
    this._savePulse = true;
    this.cdr.markForCheck();
    if (this.pulseTimer) {
      clearTimeout(this.pulseTimer);
    }
    this.pulseTimer = setTimeout(() => {
      this._savePulse = false;
      this.cdr.markForCheck();
    }, SAVE_PULSE_DURATION_MS);
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

  get saveStatus(): SaveStatus {
    return this._saveStatus;
  }

  get savePulse(): boolean {
    return this._savePulse;
  }

  get name(): string {
    return this._name;
  }

  set name(name: string) {
    this._name = name;
    this.scheduleAutoSave();
  }

  get amount(): AmountUnit {
    return this._amount;
  }

  set amount(amount: AmountUnit) {
    this._amount = amount;
    this.scheduleAutoSave();
  }

  get quantity(): number {
    return this._quantity;
  }

  set quantity(quantity: number) {
    this._quantity = Math.min(MAX_QUANTITY, Math.max(MIN_QUANTITY, Math.trunc(quantity) || 0));
    this.scheduleAutoSave();
  }

  get expiryDate(): string | null {
    return this._expiryDate;
  }

  set expiryDate(expiryDate: string | null) {
    this._expiryDate = expiryDate;
    this.scheduleAutoSave();
  }
}
