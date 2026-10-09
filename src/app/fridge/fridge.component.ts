import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar,
  MenuController,
} from '@ionic/angular';
import {
  Component,
  OnInit,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { v4 as uuidv4 } from 'uuid';
import { FridgeItem } from './models/fridge-item.dto';
import { FridgeService } from './fridge.service';
import { TodoService } from '../todo/todo.service';
import { ItemType } from '../todo/item-type.enum';
import { CategoryService } from '../category/category.service';
import { combineLatest } from 'rxjs';

const EXPIRY_WARNING_DAYS = 3;

type ExpiryStatus = 'expired' | 'soon' | 'fine' | 'none';
type SortBy = 'expiry' | 'alphabetical';

@Component({
  selector: 'app-fridge',
  templateUrl: 'fridge.component.html',
  styleUrls: ['fridge.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonTitle,
    IonToolbar,
  ],
})
export class FridgeComponent implements OnInit {
  private menuController = inject(MenuController);
  private fridgeService = inject(FridgeService);
  private todoService = inject(TodoService);
  private categoryService = inject(CategoryService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  private _items: FridgeItem[] = [];
  private _isLoading: boolean = true;
  private _reorderCategoryId: string = '';
  private _sortBy: SortBy = 'expiry';

  private _statusColors: { [key in ExpiryStatus]: string } = {
    expired: '#cc0000',
    soon: '#cca300',
    fine: '#004d00',
    none: '#555555',
  };

  ngOnInit(): void {
    this.refreshItems();

    combineLatest([
      this.categoryService.getCategories(),
      this.categoryService.getSelectedCategoryId(),
    ]).subscribe(([categories, selectedCategoryId]) => {
      const selected =
        categories.find((category) => category.id === selectedCategoryId) ??
        categories[0];
      this._reorderCategoryId = selected?.id ?? '';
    });
  }

  ionViewWillEnter(): void {
    this.refreshItems();
  }

  public refreshItems(): void {
    this._isLoading = true;
    this.fridgeService.findAll().subscribe((items) => {
      this._items = this.sortItems(items);
      this._isLoading = false;
    });
  }

  public toggleSortBy(): void {
    this._sortBy = this._sortBy === 'expiry' ? 'alphabetical' : 'expiry';
    this._items = this.sortItems(this._items);
  }

  private sortItems(items: FridgeItem[]): FridgeItem[] {
    const sorted = [...items];
    if (this._sortBy === 'alphabetical') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      // items without an expiry date sort last, not first
      sorted.sort((a, b) => {
        if (!a.expiryDate && !b.expiryDate) return 0;
        if (!a.expiryDate) return 1;
        if (!b.expiryDate) return -1;
        return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
      });
    }
    return sorted;
  }

  public openMainMenu(): void {
    this.menuController.open('main-menu');
  }

  public newItem(): void {
    this.router.navigate(['new'], { relativeTo: this.route });
  }

  public editItem(item: FridgeItem): void {
    this.router.navigate(['edit', item.id], { relativeTo: this.route });
  }

  public deleteItem(item: FridgeItem): void {
    this.fridgeService.deleteById(item.id).subscribe(() => this.refreshItems());
  }

  public reorder(item: FridgeItem): void {
    this.todoService
      .save({
        id: uuidv4(),
        categoryId: this._reorderCategoryId,
        name: item.name,
        type: ItemType.FOOD,
        amount: item.amount,
        done: false,
        itemId: item.itemId,
        quantity: 1,
      })
      .subscribe();
  }

  public expiryStatus(item: FridgeItem): ExpiryStatus {
    if (!item.expiryDate) {
      return 'none';
    }
    const daysUntilExpiry = this.daysUntilExpiry(item.expiryDate);

    if (daysUntilExpiry < 0) {
      return 'expired';
    }
    if (daysUntilExpiry <= EXPIRY_WARNING_DAYS) {
      return 'soon';
    }
    return 'fine';
  }

  public expiryLabel(item: FridgeItem): string {
    if (!item.expiryDate) {
      return '';
    }
    const days = this.daysUntilExpiry(item.expiryDate);

    if (days === 0) {
      return 'exp. today';
    }
    if (days === 1) {
      return 'exp. in 1 day';
    }
    if (days > 1) {
      return `exp. in ${days} days`;
    }
    if (days === -1) {
      return 'expired 1 day ago';
    }
    return `expired ${-days} days ago`;
  }

  private daysUntilExpiry(expiryDate: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    return Math.round((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  public getIndicatorColor(item: FridgeItem) {
    return { '--indicator-color': this._statusColors[this.expiryStatus(item)] };
  }

  get items(): FridgeItem[] {
    return this._items;
  }

  get isLoading(): boolean {
    return this._isLoading;
  }

  get sortBy(): SortBy {
    return this._sortBy;
  }
}
