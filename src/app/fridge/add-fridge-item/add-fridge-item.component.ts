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

  private _name: string = '';
  private _amount: AmountUnit = AmountUnit.PIECE;
  private _expiryDate: string | null = null;
  private _item: FridgeItem = {} as FridgeItem;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.fridgeService.findById(id).subscribe((item) => {
        this._item = item;
        this._name = item.name;
        this._amount = item.amount;
        this._expiryDate = item.expiryDate;
      });
    } else {
      this._item = {
        id: uuidv4(),
        name: this._name,
        amount: this._amount,
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
      expiryDate: this._expiryDate,
    };
    this.fridgeService.save(item).subscribe(() => this.navigateBack());
  }

  public clearExpiryDate(): void {
    this._expiryDate = null;
  }

  public inputChanged(): boolean {
    return (
      this._item.name !== this._name ||
      this._item.amount !== this._amount ||
      (this._item.expiryDate ?? null) !== this._expiryDate
    );
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

  get expiryDate(): string | null {
    return this._expiryDate;
  }

  set expiryDate(expiryDate: string | null) {
    this._expiryDate = expiryDate;
  }
}
