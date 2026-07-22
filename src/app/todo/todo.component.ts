import {
  Component,
  OnInit,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CategoryService } from '../category/category.service';
import { Suggestion } from './suggestion/suggestion.dto';
import { Todo } from './todo.dto';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ItemType } from './item-type.enum';
import { AmountUnit } from '../shared/amount-unit.enum';
import { Category } from '../category/category.dto';
import { v4 as UUIDv4 } from 'uuid';
import { TodoService } from './todo.service';
import { SuggestionService } from './suggestion/suggestion.service';
import { SuggestionFactory } from './suggestion/suggestion-factory';
import { FridgeService } from '../fridge/fridge.service';
import { combineLatest } from 'rxjs';

@Component({
  selector: 'app-todo',
  templateUrl: 'todo.component.html',
  styleUrls: ['todo.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class TodoComponent implements OnInit {
  private categoryService = inject(CategoryService);
  private todoService = inject(TodoService);
  private suggestionService = inject(SuggestionService);
  private fridgeService = inject(FridgeService);

  private _inputField: string = '';
  private _categoryInputField: string = '';
  private _currentSuggestion: Suggestion = {} as Suggestion;
  private _sortIncreasing: boolean = true;
  private _selectedCategory: Category = {} as Category;
  private _showColorBar: boolean = true;
  private _currentItemType: ItemType = ItemType.FOOD;
  private _currentAmount: AmountUnit = AmountUnit.PIECE;
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
  private _itemTypes = Object.values(ItemType);
  private _amountUnits = Object.values(AmountUnit);
  private _typeColors: { [key in ItemType]: string } = {
    [ItemType.FOOD]: '#2e7d32',
    [ItemType.USABLE]: '#e6a400',
    [ItemType.PERMANENT]: '#546e7a',
  };

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

  public addTodo(task: string) {
    const newTodo: Todo = {
      id: UUIDv4(),
      categoryId: this.selectedCategory.id,
      name: task.trim() ? task : this._currentSuggestion.suggestion,
      done: false,
      type: this._currentItemType || ItemType.FOOD,
      amount: this._currentAmount || AmountUnit.PIECE,
    };

    this.todoService.save(newTodo).subscribe();

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
          quantity: 1,
          expiryDate: null,
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

  public toggleColorBar() {
    this._showColorBar = !this._showColorBar;
  }

  public getTodoBackgroundColor(type: ItemType) {
    return {
      '--indicator-color': this._typeColors[type] || this._typeColors[ItemType.FOOD],
    };
  }

  public getCircleColorBackground(type: ItemType) {
    return { 'background-color': this._typeColors[type] };
  }

  public isCurrentType(type: ItemType): boolean {
    return this._currentItemType === type;
  }

  public setCurrentItemType(type: ItemType): void {
    this._currentItemType = type;
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

  get showColorBar(): boolean {
    return this._showColorBar;
  }

  get currentItemType(): ItemType {
    return this._currentItemType;
  }

  get itemTypes(): ItemType[] {
    return this._itemTypes;
  }

  get currentAmount(): AmountUnit {
    return this._currentAmount;
  }

  set currentAmount(amount: AmountUnit) {
    this._currentAmount = amount;
  }

  get amountUnits(): AmountUnit[] {
    return this._amountUnits;
  }

  get isLoading(): boolean {
    return this._isLoading;
  }

  get categoryTasks() {
    return this._tasks;
  }
}
