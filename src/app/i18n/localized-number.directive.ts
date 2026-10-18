import {Directive, effect, ElementRef, forwardRef, HostListener, inject} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from '@angular/forms';
import {LocalizationService} from './localization.service';

/** Decimal editing accepts either decimal separator and stores a number, never formatted text. */
@Directive({
  selector: 'input[appLocalizedNumber]', standalone: true,
  providers: [{provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => LocalizedNumberDirective), multi: true}],
  host: {'[type]': '"text"', 'inputmode': 'decimal'},
})
export class LocalizedNumberDirective implements ControlValueAccessor {
  private readonly element = inject<ElementRef<HTMLInputElement>>(ElementRef);
  private readonly i18n = inject(LocalizationService);
  private amount: number | null = null;
  private editing = false;
  private changed: (value: number | null) => void = () => {};
  private touched: () => void = () => {};
  constructor() {effect(() => {this.i18n.locale(); if (!this.editing) this.render();});}
  public writeValue(value: number | null): void {this.amount = value; if (!this.editing) this.render();}
  public registerOnChange(fn: (value: number | null) => void): void {this.changed = fn;}
  public registerOnTouched(fn: () => void): void {this.touched = fn;}
  public setDisabledState(disabled: boolean): void {this.element.nativeElement.disabled = disabled;}
  @HostListener('focus') public focus(): void {this.editing = true;}
  @HostListener('blur') public blur(): void {this.editing = false; this.touched(); this.render();}
  @HostListener('input') public input(): void {
    const value = this.element.nativeElement.value.trim();
    this.amount = /^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(value) ? Number(value.replace(',', '.')) : null;
    if (this.amount !== null && !Number.isFinite(this.amount)) this.amount = null;
    this.changed(this.amount);
  }
  private render(): void {
    this.element.nativeElement.value = this.amount == null ? '' : new Intl.NumberFormat(this.i18n.locale(), {useGrouping: false, maximumFractionDigits: 12}).format(this.amount);
  }
}
