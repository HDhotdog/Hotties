import {Component, OnInit} from '@angular/core';
import {CategoryService} from '../category/category.service';
import {RxSuggestion} from './suggestion/rxSuggestion';
import {RxToDo} from './rxToDo';
import {IonicModule} from '@ionic/angular';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {ImportanceLevel} from "./importance-level.enum";
import {RxCategory} from "../category/category";
import {v4 as UUIDv4} from 'uuid';
import {TodoService} from "./todo.service";
import {SuggestionService} from "./suggestion/suggestion.service";
import {SuggestionFactory} from "./suggestion/suggestion-factory";


@Component({
  selector: 'app-todo',
  templateUrl: 'todo.component.html',
  styleUrls: ['todo.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class TodoComponent implements OnInit {

  private _inputField: string = "";
  private _categoryInputField: string = "";
  private _currentSuggestion: RxSuggestion = {} as RxSuggestion;
  private _sortIncreasing: boolean = true;
  private _selectedCategory: RxCategory = {} as RxCategory;
  private _showColorBar: boolean = true;
  private _currentImportanceLevel: ImportanceLevel = ImportanceLevel.NORMAL;
  private suggestion_suffixes: string[] = [
    "?", "!", " :O", " O:", " owo", " c:", " OwO", " uwu", " :o", " o:", " :D"
  ]
  private _isLoading: boolean = true;
  private _importanceLevels = Object.keys(ImportanceLevel);
  private _importanceColors: { [key: string]: string } = {
    [ImportanceLevel.LOW]: '#ffd700',
    [ImportanceLevel.NORMAL]: '#007bff',
    [ImportanceLevel.HIGH]: '#ff0000',
    [ImportanceLevel.VERY_HIGH]: '#ff00ff'
  };

  private _categories: RxCategory[] = [];
  private _suggestions: RxSuggestion[] = [];
  private _tasks: RxToDo[] = [];

  constructor(private categoryService: CategoryService,
              private todoService: TodoService,
              private suggestionService: SuggestionService) {
  }

  async ngOnInit() {
    this.init();
  }

  async ionViewWillEnter() {
    this.init();
    this.generateSuggestion();
  }

  private init() {
    const categories = this.categoryService.getCategories();
    const selectedCategoryId: string | null = localStorage.getItem('selectedCategoryId');

    categories.subscribe((categories) => {
      this._categories = categories;
      if (selectedCategoryId != null) {
        this._selectedCategory = categories.find((category) => category.id === selectedCategoryId)!;
      } else {
        this._selectedCategory = categories[0];
      }
      this._categoryInputField = this._selectedCategory.id;
      this._currentSuggestion = {
        id: UUIDv4(),
        categoryId: this.selectedCategory.id,
        suggestion: "Cookies",
        suffix: "! :D"
      }
      this.refreshTodos();
      this.refreshSuggestions();
    })
  }

  public refreshTodos(): void {
    this._isLoading = true;
    this.todoService.findByCategoryId(this.selectedCategory.id).subscribe(
      (tasks) => {
        this._tasks = tasks;
        this._isLoading = false;
      }
    )
  }

  public refreshSuggestions(): void {
    this._isLoading = true;
    this.suggestionService.findByCategoryId(this.selectedCategory.id).subscribe(
      (suggestions) => {
        this._suggestions = suggestions;
        this._isLoading = false;
      }
    )
  }

  public addTodo(task: string) {
    const newTodo: RxToDo = {
      id: UUIDv4(),
      categoryId: this.selectedCategory.id,
      name: task.trim() ? task : this._currentSuggestion.suggestion,
      done: false,
      importance: this._currentImportanceLevel || ImportanceLevel.NORMAL
    };

    this.todoService.save(newTodo).subscribe();

    if (task.trim()) {
      this.saveSuggestion(task);
    }

    this._inputField = "";
    this.generateSuggestion();
  }

  public clearTodos() {
    setTimeout(() => {
      this.todoService.deleteByCategoryId(this.selectedCategory.id).subscribe();
    }, 1100);
  }

  public markAsDone(todo: RxToDo) {
    this.todoService.deleteById(todo.id).subscribe();
    this.refreshTodos();
  }

  public generateSuggestion(): void {
    if (this._suggestions.length == 0) {
      this.suggestionService.save(SuggestionFactory.createSuggestionWithoutSuffix("Cookies", this.selectedCategory.id))
        .subscribe((suggestion) => {
          this._currentSuggestion = suggestion;
        });
    } else {
      const suggestion = this._suggestions[Math.floor(Math.random() * this._suggestions.length)];

      const suffix = this.suggestion_suffixes[Math.floor(Math.random() * this.suggestion_suffixes.length)];
      this._currentSuggestion = {
        id: suggestion.id,
        categoryId: suggestion.categoryId,
        suggestion: suggestion.suggestion,
        suffix: suffix
      }

      this.refreshSuggestions();
    }

  }

  private saveSuggestion(suggestionText: string) {
    if (this._selectedCategory.saveSuggestions) {
      const included: boolean = this._suggestions
        .filter((suggestion) => suggestion.suggestion.toLowerCase() == suggestionText.trim().toLowerCase()).length > 0

      if (!included) {
        this.suggestionService.save(SuggestionFactory.createSuggestionWithoutSuffix(suggestionText, this.selectedCategory.id))
          .subscribe()
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

    this.categoryService.save(this._selectedCategory);
  }

  public changeCategory() {
    const selectedCategory = this.categories.find(
      c => c.id === this.categoryInputField
    );
    this._selectedCategory = selectedCategory!
    this.categoryService.saveCurrentCategory(this._selectedCategory)
    this.refreshTodos()
    this.generateSuggestion();
  }

  public toggleColorBar() {
    this._showColorBar = !this._showColorBar;
  }

  public getTodoBackgroundColor(importance: ImportanceLevel) {
    return {
      '--indicator-color': this._importanceColors[importance] || this._importanceColors[ImportanceLevel.NORMAL]
    };
  }

  public getCircleColorBackground(color: string) {
    const importanceLevel = this.getCircleColor(color);
    return {'background-color': this._importanceColors[importanceLevel]};
  }

  public getCircleColor(color: string): ImportanceLevel {
    const enumEntries = Object.entries(ImportanceLevel);
    return enumEntries.filter(entry => entry.includes(color))[0][1];
  }

  public isCurrentLevel(color: string) {
    return this._currentImportanceLevel === this.getCircleColor(color)
  }

  public setCurrentImportanceLevel(level: string) {
    this._currentImportanceLevel = this.getCircleColor(level);
  }

  get categories(): RxCategory[] {
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

  get selectedCategory(): RxCategory {
    return this._selectedCategory;
  }

  get showColorBar(): boolean {
    return this._showColorBar;
  }

  get currentImportanceLevel(): ImportanceLevel {
    return this._currentImportanceLevel;
  }

  get importanceLevels(): string[] {
    return this._importanceLevels;
  }

  get isLoading(): boolean {
    return this._isLoading;
  }

  get categoryTasks() {
    return this._tasks;
  }
}
