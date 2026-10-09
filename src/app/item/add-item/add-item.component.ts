import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
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
import { Item } from '../models/item.dto';
import { ItemService } from '../item.service';
import { AmountUnit } from '../../shared/amount-unit.enum';
import { ItemType } from '../../todo/item-type.enum';
import { ITEM_TYPE_COLORS } from '../../todo/item-type-colors';
import { v4 as uuidv4 } from 'uuid';

const AUTO_SAVE_DELAY_MS = 500;
const SAVE_PULSE_DURATION_MS = 300;

export type SaveStatus = 'saved' | 'unsaved';

@Component({
  selector: 'app-add-item',
  templateUrl: './add-item.component.html',
  styleUrls: ['./add-item.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonTitle,
    IonToolbar,
  ],
})
export class AddItemComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private itemService = inject(ItemService);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  public readonly amountUnits = Object.values(AmountUnit);
  public readonly itemTypes = Object.values(ItemType);

  private _name: string = '';
  private _price: number | null = null;
  private _unit: AmountUnit = AmountUnit.PIECE;
  private _amount: number = 1;
  private _type: ItemType = ItemType.FOOD;
  private _item: Item = {} as Item;

  private _saveStatus: SaveStatus = 'saved';
  private _savePulse: boolean = false;
  private autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
  private pulseTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.itemService.findById(id).subscribe((item) => {
        this._item = item;
        this._name = item.name;
        this._price = item.price;
        this._unit = item.unit;
        this._amount = item.amount;
        this._type = item.type;
        this.cdr.markForCheck();
      });
    } else {
      this._item = {
        id: uuidv4(),
        name: this._name,
        price: this._price,
        unit: this._unit,
        amount: this._amount,
        type: this._type,
      };
    }
  }

  ngOnDestroy(): void {
    this.flushPendingSave();
    if (this.pulseTimer) {
      clearTimeout(this.pulseTimer);
    }
  }

  public navigateBack(): void {
    this.flushPendingSave();
    void this.router.navigate(['/tabs/items']);
  }

  public setType(type: ItemType): void {
    this.type = type;
  }

  public getTypeColor(type: ItemType): { [key: string]: string } {
    return { 'background-color': ITEM_TYPE_COLORS[type] };
  }

  private scheduleAutoSave(): void {
    this.setSaveStatus('unsaved');
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }
    this.autoSaveTimer = setTimeout(() => {
      this.autoSaveTimer = null;
      this.persist();
    }, AUTO_SAVE_DELAY_MS);
  }

  private flushPendingSave(): void {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
      this.autoSaveTimer = null;
      this.persist();
    }
  }

  private persist(): void {
    const item: Item = {
      ...this._item,
      id: this._item.id,
      name: this._name,
      price: this._price,
      unit: this._unit,
      amount: this._amount,
      type: this._type,
    };
    this.itemService.save(item).subscribe(() => {
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

  get price(): number | null {
    return this._price;
  }

  set price(price: number | null) {
    this._price = price;
    this.scheduleAutoSave();
  }

  get unit(): AmountUnit {
    return this._unit;
  }

  set unit(unit: AmountUnit) {
    this._unit = unit;
    this.scheduleAutoSave();
  }

  get amount(): number {
    return this._amount;
  }

  set amount(amount: number) {
    this._amount = amount;
    this.scheduleAutoSave();
  }

  get type(): ItemType {
    return this._type;
  }

  set type(type: ItemType) {
    this._type = type;
    this.scheduleAutoSave();
  }
}
