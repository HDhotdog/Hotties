import {
  Component,
  OnInit,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CategoryService } from '../category/category.service';
import { Suggestion } from './suggestion/suggestion.dto';
import { Todo } from './todo.dto';
import { IonicModule, MenuController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ItemType } from './item-type.enum';
import { ITEM_TYPE_COLORS } from './item-type-colors';
import { Category } from '../category/category.dto';
import { v4 as UUIDv4 } from 'uuid';
import { TodoService } from './todo.service';
import { SuggestionService } from './suggestion/suggestion.service';
import { SuggestionFactory } from './suggestion/suggestion-factory';
import { FridgeService } from '../fridge/fridge.service';
import { ItemService } from '../item/item.service';
import { AmountUnit } from '../shared/amount-unit.enum';
import { combineLatest } from 'rxjs';
import { ItemAutocompleteComponent } from '../item/item-autocomplete/item-autocomplete.component';

@Component({
  selector: 'app-todo',
  templateUrl: 'todo.component.html',
  styleUrls: ['todo.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [IonicModule, CommonModule, FormsModule, ItemAutocompleteComponent],
})
export class TodoComponent implements OnInit {
  private menuController = inject(MenuController);
  private categoryService = inject(CategoryService);
  private todoService = inject(TodoService);
  private suggestionService = inject(SuggestionService);
  private fridgeService = inject(FridgeService);
  private itemService = inject(ItemService);

  private _inputField: string = '';
  private _categoryInputField: string = '';
  private _currentSuggestion: Suggestion = {} as Suggestion;
  private _sortIncreasing: boolean = true;
  private _selectedCategory: Category = {} as Category;
  private suggestion_suffixes: string[] = [
    '?',
    '!',
    ' :O',
    ' O:',
    ' owo',
    ' c:',
    ' OwO',
    ' uwu',
    ' :o',
    ' o:',
    ' :D',
  ];
  private _isLoading: boolean = true;

  private _categories: Category[] = [];
  private _suggestions: Suggestion[] = [];
  private _tasks: Todo[] = [];

  async ngOnInit() {
    this.init();
  }

  async ionViewWillEnter() {
    this.init();
    this.generateSuggestion();
  }

  private init() {
    const categories = this.categoryService.getCategories();
    const selectedCategoryId = this.categoryService.getSelectedCategoryId();

    combineLatest([categories, selectedCategoryId]).subscribe(
      ([categories, selectedCategoryId]) => {
        this._categories = categories;
        if (selectedCategoryId != null) {
          this._selectedCategory =
            categories.find((category) => category.id === selectedCategoryId) ??
            categories[0];
        } else {
          this._selectedCategory = categories[0];
        }
        this._categoryInputField = this._selectedCategory.id;
        this._currentSuggestion = {
          id: UUIDv4(),
          categoryId: this.selectedCategory.id,
          suggestion: 'Cookies',
          suffix: '! :D',
        };
        this.refreshTodos();
        this.refreshSuggestions();
      }
    );
  }

  public refreshTodos(): void {
    this._isLoading = true;
    this.todoService
      .findByCategoryId(this.selectedCategory.id)
      .subscribe((tasks) => {
        this._tasks = tasks;
        this._isLoading = false;
      });
  }

  public refreshSuggestions(): void {
    this._isLoading = true;
    this.suggestionService
      .findByCategoryId(this.selectedCategory.id)
      .subscribe((suggestions) => {
        this._suggestions = suggestions;
        this._isLoading = false;
      });
  }

  /**
   * Adding an item that's already on the list (in this category) sums into its
   * existing quantity instead of creating a duplicate row. Brand-new items
   * default to `Packung` (see TodoService.resolveItem), and type/amount always
   * mirror the linked item rather than being chosen here.
   */
  public addTodo(task: string) {
    const name = task.trim() ? task : this._currentSuggestion.suggestion;

    this.itemService.findOrCreateByName(name, AmountUnit.PACKAGE).subscribe((item) => {
      const existing = this._tasks.find((t) => t.itemId === item.id);

      if (existing) {
        this.todoService.save({ ...existing, quantity: existing.quantity + 1 }).subscribe(() => this.refreshTodos());
      } else {
        const newTodo: Todo = {
          id: UUIDv4(),
          categoryId: this.selectedCategory.id,
          name: item.name,
          done: false,
          type: item.type,
          amount: item.unit,
          itemId: item.id,
          quantity: 1,
        };
        this.todoService.save(newTodo).subscribe(() => this.refreshTodos());
      }
    });

    if (task.trim()) {
      this.saveSuggestion(task);
    }

    this._inputField = '';
    this.generateSuggestion();
  }

  public clearTodos() {
    setTimeout(() => {
      this.todoService.deleteByCategoryId(this.selectedCategory.id).subscribe();
    }, 1100);
  }

  public markAsDone(todo: Todo) {
    if (todo.type === ItemType.FOOD) {
      this.fridgeService
        .save({
          id: UUIDv4(),
          name: todo.name,
          amount: todo.amount,
          quantity: todo.quantity,
          expiryDate: null,
          itemId: todo.itemId,
        })
        .subscribe();
    }
    this.todoService.deleteById(todo.id).subscribe();
    this.refreshTodos();
  }

  public generateSuggestion(): void {
    if (this._suggestions.length == 0) {
      this.suggestionService
        .save(
          SuggestionFactory.createSuggestionWithoutSuffix(
            'Cookies',
            this.selectedCategory.id
          )
        )
        .subscribe((suggestion) => {
          this._currentSuggestion = suggestion;
        });
    } else {
      const suggestion =
        this._suggestions[Math.floor(Math.random() * this._suggestions.length)];

      const suffix =
        this.suggestion_suffixes[
          Math.floor(Math.random() * this.suggestion_suffixes.length)
        ];
      this._currentSuggestion = {
        id: suggestion.id,
        categoryId: suggestion.categoryId,
        suggestion: suggestion.suggestion,
        suffix: suffix,
      };

      this.refreshSuggestions();
    }
  }

  private saveSuggestion(suggestionText: string) {
    if (this._selectedCategory.saveSuggestions) {
      const included: boolean =
        this._suggestions.filter(
          (suggestion) =>
            suggestion.suggestion.toLowerCase() ==
            suggestionText.trim().toLowerCase()
        ).length > 0;

      if (!included) {
        this.suggestionService
          .save(
            SuggestionFactory.createSuggestionWithoutSuffix(
              suggestionText,
              this.selectedCategory.id
            )
          )
          .subscribe();
      }
    }
  }

  public get getCurrentSuggestion() {
    return this._currentSuggestion.suggestion + this._currentSuggestion.suffix;
  }

  public openMainMenu(): void {
    this.menuController.open('main-menu');
  }

  public changeSort() {
    if (this._sortIncreasing) {
      this._sortIncreasing = false;
      this.categoryTasks.sort(function (a, b) {
        return a.name.localeCompare(b.name);
      });
    } else {
      this._sortIncreasing = true;
      this.categoryTasks.sort(function (a, b) {
        return b.name.localeCompare(a.name);
      });
    }

    this.categoryService.save(this._selectedCategory).subscribe();
  }

  public changeCategory() {
    const selectedCategory = this.categories.find(
      (c) => c.id === this.categoryInputField
    );
    this._selectedCategory = selectedCategory!;
    this.categoryService
      .saveCurrentCategory(this._selectedCategory)
      .subscribe();
    this.refreshTodos();
    this.generateSuggestion();
  }

  public getTodoBackgroundColor(type: ItemType) {
    return {
      '--indicator-color': ITEM_TYPE_COLORS[type] || ITEM_TYPE_COLORS[ItemType.FOOD],
    };
  }

  get categories(): Category[] {
    return this._categories;
  }

  get inputField(): string {
    return this._inputField;
  }

  set inputField(inputField: string) {
    this._inputField = inputField;
  }

  get categoryInputField(): string {
    return this._categoryInputField;
  }

  set categoryInputField(categoryInputField: string) {
    this._categoryInputField = categoryInputField;
  }

  get sortIncreasing(): boolean {
    return this._sortIncreasing;
  }

  get selectedCategory(): Category {
    return this._selectedCategory;
  }

  get isLoading(): boolean {
    return this._isLoading;
  }

  get categoryTasks() {
    return this._tasks;
  }
}
