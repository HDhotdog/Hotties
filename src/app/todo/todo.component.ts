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
  private _currentCategoryIndex: string = "";
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

    categories.subscribe((categories) => {
      this._categories = categories;
      this._selectedCategory = categories[0];
      this._currentCategoryIndex = localStorage.getItem('selectedCategoryId') || this.categories[0].id;
      this._categoryInputField = this._selectedCategory.name;
      this._currentSuggestion = {
        id: UUIDv4(),
        categoryId: this.selectedCategory.id,
        suggestion: "Cookies",
        suffix: "! :D"
      }
      this.refreshTodos();
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
    // this.generateSuggestion();
  }

  public clearTodos() {
    // this._selectedCategory.elements.forEach(todo => todo.done = true);
    setTimeout(() => {
      // this._selectedCategory.elements.length = 0;
      this.categoryService.save(this._selectedCategory);
    }, 1100);
  }

  public markAsDone(todo: RxToDo) {
    this.todoService.deleteById(todo.id).subscribe();
    this.refreshTodos();
    // const todoIndex = this._selectedCategory.elements.indexOf(todo);
    // if (todoIndex === -1) return; // Todo not found
    //
    // this._selectedCategory.elements.splice(todoIndex, 1);
    // this.categoryService.save(this._selectedCategory);
  }

  public generateSuggestion(): void {
    if (this._suggestions.length == 0) {
      this.suggestionService.save(SuggestionFactory.createSuggestionWithoutSuffix("Cookies", this.selectedCategory.id))
        .subscribe();
    }
    const suggestion = this._suggestions[Math.floor(Math.random() * this._suggestions.length)];

    // const suggestion = this._selectedCategory.suggestions[Math.floor(Math.random() * this._selectedCategory.suggestions.length)];
    const suffix = this.suggestion_suffixes[Math.floor(Math.random() * this.suggestion_suffixes.length)];
    this._currentSuggestion = {
      id: suggestion.id,
      categoryId: suggestion.categoryId,
      suggestion: suggestion.suggestion,
      suffix: suffix
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
      //TODO fix
      // this._selectedCategory.elements.sort(function (a, b) {
      //   return a.task.localeCompare(b.task);
      // });
    } else {
      this._sortIncreasing = true;
      // this._selectedCategory.elements.sort(function (a, b) {
      //   return b.task.localeCompare(a.task);
      // });
    }

    this.categoryService.save(this._selectedCategory);
  }

  public changeCategory() {
    this.categoryService.getCategories().subscribe((categories) => {
      const index = categories.map(function (e) {
        return e.name;
      }).indexOf(this._categoryInputField);
      if (index >= 0) {
        this._selectedCategory = categories[index];
        this._currentCategoryIndex = this._selectedCategory.id;
        this.suggestionService.findByCategoryId(this.selectedCategory.id)
          .subscribe((suggestions) => {
            this._suggestions = suggestions;
          })
        this.categoryService.saveCurrentCategory(this.selectedCategory);
      }
      this.generateSuggestion();
    });
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

  get lastCategory(): number {
    return this.lastCategory;
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

  get currentSuggestion(): RxSuggestion {
    return this._currentSuggestion;
  }

  get sortIncreasing(): boolean {
    return this._sortIncreasing;
  }

  get currentCategoryIndex(): string {
    return this._currentCategoryIndex;
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

  get importanceColors(): { [key: string]: string } {
    return this._importanceColors;
  }

  get isLoading(): boolean {
    return this._isLoading;
  }

  get categoryTasks() {
    return this._tasks;
  }
}
