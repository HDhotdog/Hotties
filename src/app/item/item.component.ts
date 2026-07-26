import {
  Component,
  OnInit,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { forkJoin, map, of, switchMap } from 'rxjs';
import { Item } from './models/item.dto';
import { ItemService } from './item.service';

export interface ItemRow extends Item {
  /** False if a todo, fridge item, or recipe ingredient still references this item. */
  deletable: boolean;
}

@Component({
  selector: 'app-item',
  templateUrl: 'item.component.html',
  styleUrls: ['item.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [IonicModule, CommonModule, FormsModule, RouterModule],
})
export class ItemComponent implements OnInit {
  private itemService = inject(ItemService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  private _items: ItemRow[] = [];
  private _isLoading: boolean = true;
  private _errorMessage: string | null = null;

  ngOnInit(): void {
    this.refreshItems();
  }

  ionViewWillEnter(): void {
    this.refreshItems();
  }

  public refreshItems(): void {
    this._isLoading = true;
    this.itemService
      .findAll()
      .pipe(
        map((items) => [...items].sort((a, b) => a.name.localeCompare(b.name))),
        switchMap((items) =>
          items.length === 0
            ? of([])
            : forkJoin(
                items.map((item) =>
                  this.itemService.isDeletable(item.id).pipe(map((deletable) => ({ ...item, deletable })))
                )
              )
        )
      )
      .subscribe((rows) => {
        this._items = rows;
        this._isLoading = false;
      });
  }

  public newItem(): void {
    this.router.navigate(['new'], { relativeTo: this.route });
  }

  public editItem(item: Item): void {
    this.router.navigate(['edit', item.id], { relativeTo: this.route });
  }

  public deleteItem(item: ItemRow): void {
    if (!item.deletable) {
      return;
    }
    this._errorMessage = null;
    this.itemService.deleteById(item.id).subscribe({
      next: () => this.refreshItems(),
      error: (err) => {
        this._errorMessage = err?.message ?? 'Could not delete item.';
      },
    });
  }

  get items(): ItemRow[] {
    return this._items;
  }

  get isLoading(): boolean {
    return this._isLoading;
  }

  get errorMessage(): string | null {
    return this._errorMessage;
  }
}
