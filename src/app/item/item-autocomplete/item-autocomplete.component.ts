import {IonInput, IonItem, IonLabel, IonList,} from '@ionic/angular';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {Item} from '../models/item.dto';
import {ItemService} from '../item.service';

const MAX_SUGGESTIONS = 5;
const BLUR_HIDE_DELAY_MS = 150;

/**
 * A text input that suggests existing `items` by name as the user types, so
 * picking an item that's already used elsewhere (shopping list, fridge, a
 * recipe) is discoverable instead of relying on an exact-name match happening
 * silently. Selecting a suggestion just fills in that item's name - the
 * existing find-or-create-by-name linking (ItemService.findOrCreateByName)
 * takes care of resolving that name back to the same item on save.
 */
@Component({
  selector: 'app-item-autocomplete',
  templateUrl: './item-autocomplete.component.html',
  styleUrls: ['./item-autocomplete.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    IonInput,
    IonItem,
    IonLabel,
    IonList,
  ],
})
export class ItemAutocompleteComponent implements OnInit {
  private itemService = inject(ItemService);
  private cdr = inject(ChangeDetectorRef);

  @Input() value: string = '';
  @Input() placeholder: string = '';
  @Input() inputClass: string = '';
  /** Set true when the input sits near the bottom of the viewport, so the suggestion list doesn't get clipped opening downward. */
  @Input() openUpward: boolean = false;
  /** Set true to submit (emit `enter`) right after picking a suggestion, instead of just filling the input. */
  @Input() selectSubmits: boolean = false;
  @Output() valueChange = new EventEmitter<string>();
  @Output() enter = new EventEmitter<void>();

  private _items: Item[] = [];
  private _showSuggestions: boolean = false;

  ngOnInit(): void {
    this.itemService.findAll().subscribe((items) => {
      this._items = items;
      this.cdr.markForCheck();
    });
  }

  public onInput(newValue: string): void {
    this.value = newValue;
    this.valueChange.emit(newValue);
    this._showSuggestions = newValue.trim().length > 0;
  }

  public onFocus(): void {
    this._showSuggestions = this.value.trim().length > 0;
  }

  public onBlur(): void {
    // Delayed so a click on a suggestion registers before the list hides.
    setTimeout(() => {
      this._showSuggestions = false;
      this.cdr.markForCheck();
    }, BLUR_HIDE_DELAY_MS);
  }

  public onEnter(): void {
    this._showSuggestions = false;
    this.enter.emit();
  }

  public selectSuggestion(item: Item): void {
    this.value = item.name;
    this.valueChange.emit(item.name);
    this._showSuggestions = false;
    if (this.selectSubmits) {
      this.enter.emit();
    }
  }

  get showSuggestions(): boolean {
    return this._showSuggestions && this.suggestions.length > 0;
  }

  get suggestions(): Item[] {
    const normalized = this.value.trim().toLowerCase();
    if (!normalized) {
      return [];
    }
    return this._items
      .filter((item) => item.name.toLowerCase().includes(normalized))
      .slice(0, MAX_SUGGESTIONS);
  }
}
