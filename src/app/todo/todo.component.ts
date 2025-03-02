import { Component, OnInit } from '@angular/core';
import { Category } from '../category/category';
import { CategoryService } from '../category/category.service';
import { Suggestion } from './suggestion/suggestion';
import { ToDo, ImportanceLevel } from './todo';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

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
  private _currentSuggestion: Suggestion = { suggestion: "Cookies", suffix: "! :D" };
  private _sortIncreasing: boolean = true;
  private _currentCategoryIndex: number = 0;
  private _selectedCategory: Category = {} as Category;
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

  private _categories: Category[] = [];

  constructor(private categoryService: CategoryService) {
  }

  async ngOnInit() {
    const categories = this.categoryService.getCategories();
    const lastCategory = this.categoryService.getLastCategory();
    
    forkJoin([categories, lastCategory]).subscribe(([categories, lastCategory]) => {
      this._categories = categories;
      this._currentCategoryIndex = lastCategory;
      this._selectedCategory = categories[this._currentCategoryIndex];
      this._categoryInputField = this._selectedCategory.name;
      this._isLoading = false;
    });
  }

  async ionViewWillEnter() {
    const categories = this.categoryService.getCategories();
    const lastCategory = this.categoryService.getLastCategory();

    forkJoin([categories, lastCategory]).subscribe(([categories, lastCategory]) => {
      this._categories = categories;
      this._currentCategoryIndex = lastCategory;
      this._selectedCategory = categories[this._currentCategoryIndex];
      this._categoryInputField = this._selectedCategory.name;
      this._isLoading = false;
    });

    this.generateSuggestion();
  }

  public addTodo(task: string) {
    const newTodo: ToDo = {
      task: task.trim() ? task : this._currentSuggestion.suggestion,
      done: false,
      importance: this._currentImportanceLevel || ImportanceLevel.NORMAL
    };

    this._selectedCategory.elements.push(newTodo);
    
    if (task.trim()) {
      this.saveSuggestion(task);
    }
    
    this._inputField = "";
    this.categoryService.save(this._selectedCategory);
    this.generateSuggestion();
  }

  public clearTodos() {
    this._selectedCategory.elements.forEach(todo => todo.done = true);
    setTimeout(() => {
      this._selectedCategory.elements.length = 0;
      this.categoryService.save(this._selectedCategory);
    }, 1100);
  }

  public markAsDone(todo: ToDo) {
    const todoIndex = this._selectedCategory.elements.indexOf(todo);
    if (todoIndex === -1) return; // Todo not found
    
    this._selectedCategory.elements.splice(todoIndex, 1);
    this.categoryService.save(this._selectedCategory);
  }

  public generateSuggestion(): void {
    if (this._selectedCategory.suggestions.length == 0) {
      this._selectedCategory.suggestions.push("Cookies");
    }

    const suggestion = this._selectedCategory.suggestions[Math.floor(Math.random() * this._selectedCategory.suggestions.length)];
    const suffix = this.suggestion_suffixes[Math.floor(Math.random() * this.suggestion_suffixes.length)];
    this._currentSuggestion = {
      suggestion: suggestion,
      suffix: suffix
    }
  }

  private saveSuggestion(text: string) {
    if (this._selectedCategory.saveSuggestions) {
      const included: boolean = this._selectedCategory.suggestions
        .filter((sugg) => sugg.toLowerCase() == text.trim().toLowerCase()).length > 0

      if (!included) {
        this._selectedCategory.suggestions.push(text);
        this.categoryService.save(this._selectedCategory);
      }
    }
  }

  public get getCurrentSuggestion() {
    return this._currentSuggestion.suggestion + this._currentSuggestion.suffix;
  }

  public changeSort() {
    if (this._sortIncreasing) {
      this._sortIncreasing = false;
      this._selectedCategory.elements.sort(function (a, b) {
        return a.task.localeCompare(b.task);
      });
    } else {
      this._sortIncreasing = true;
      this._selectedCategory.elements.sort(function (a, b) {
        return b.task.localeCompare(a.task);
      });
    }

    this.categoryService.save(this._selectedCategory);
  }

  public changeCategory() {
    this.categoryService.getCategories().subscribe((categories) => {
      const index = categories.map(function (e) { return e.name; }).indexOf(this._categoryInputField);
      if (index >= 0) {
        this._selectedCategory = categories[index];
        this._currentCategoryIndex = index;
        this.categoryService.saveLastCategory(this._currentCategoryIndex);
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

  get categories(): Category[] {
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

  get currentSuggestion(): Suggestion {
    return this._currentSuggestion;
  }

  get sortIncreasing(): boolean {
    return this._sortIncreasing;
  }

  get currentCategoryIndex(): number {
    return this._currentCategoryIndex;
  }

  get selectedCategory(): Category {
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

}
