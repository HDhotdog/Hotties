import { Component, OnInit } from '@angular/core';
import { Category } from '../category/category';
import { CategoryService } from '../category/category.service';
import { Suggestion } from '../suggestion/suggestion.service';
import { ToDo } from './todo';

@Component({
  selector: 'app-todo',
  templateUrl: 'todo.component.html',
  styleUrls: ['todo.component.scss']
})
export class TodoComponent implements OnInit {

  public inputField: string = "";
  public categoryInputField: string = "";
  public currentSuggestion: Suggestion = { suggestion: "Cookies", suffix: "! :D" };
  public sortIncreasing: boolean = false;
  public categoryService: CategoryService;
  public currentCategoryIndex: number = 0;
  public selectedCategory: Category = {} as Category;
  private suggestion_suffixes: string[] = [
    "?", "!", " :O", " O:", " owo", " c:", " OwO", " uwu", " :o", " o:", " :D"
  ]
  public isLoading: boolean = true;

  constructor(categoryService: CategoryService) {
    this.categoryService = categoryService;
  }

  async ngOnInit() {
    await this.categoryService.loadCategories().then(() => {
      this.currentCategoryIndex = this.categoryService.lastCategory;
      this.selectedCategory = this.categoryService.categories[this.currentCategoryIndex];
      this.categoryInputField = this.selectedCategory.name;
      this.isLoading = false;
    });
  }

  async ionViewWillEnter() {
    await this.categoryService.loadCategories().then(() => {
      this.selectedCategory = this.categoryService.categories[0];
      this.categoryInputField = this.selectedCategory.name;
    });

    this.generateSuggestion();
  }

  public addTodo(task: string) {
    if (task.trim()) {
      this.categoryService.categories[this.currentCategoryIndex].elements.push({
        task: task,
        done: false
      });
      this.saveSuggestion(task);
    } else if (!task) {
      this.categoryService.categories[this.currentCategoryIndex].elements.push({
        task: this.currentSuggestion.suggestion,
        done: false
      });
    }
    this.inputField = "";
    this.categoryService.saveCategories();
    this.generateSuggestion();
  }

  public clearTodos() {
    this.categoryService.categories[this.currentCategoryIndex].elements.forEach(todo => todo.done = true);
    setTimeout(() => {
      this.categoryService.categories[this.currentCategoryIndex].elements.length = 0;
      this.categoryService.saveCategories();
    }, 1100);
  }

  public markAsDone(todo: ToDo) {
    const todoIndex = this.categoryService.categories[this.currentCategoryIndex].elements.indexOf(todo);
    this.categoryService.categories[this.currentCategoryIndex].elements[todoIndex].done = true;
    setTimeout(() => {
      this.categoryService.categories[this.currentCategoryIndex].elements.splice(todoIndex, 1);
      this.categoryService.saveCategories();
    }, 1100);
  }

  public generateSuggestion(): void {
    if (this.selectedCategory.suggestions.length == 0) {
      this.selectedCategory.suggestions.push("Cookies");
    }

    const suggestion = this.selectedCategory.suggestions[Math.floor(Math.random() * this.selectedCategory.suggestions.length)];
    const suffix = this.suggestion_suffixes[Math.floor(Math.random() * this.suggestion_suffixes.length)];
    this.currentSuggestion = {
      suggestion: suggestion,
      suffix: suffix
    }
  }

  private saveSuggestion(text: string) {
    if (this.selectedCategory.saveSuggestions) {
      const included: boolean = this.selectedCategory.suggestions
        .filter((sugg) => sugg.toLowerCase() == text.trim().toLowerCase()).length > 0

      if (!included) {
        this.selectedCategory.suggestions.push(text);
        this.categoryService.saveCategories();
      }
    }
  }

  public get getCurrentSuggestion() {
    return this.currentSuggestion.suggestion + this.currentSuggestion.suffix;
  }

  public changeSort() {
    if (this.sortIncreasing) {
      this.sortIncreasing = false;
      this.categoryService.categories.forEach(category => category.elements.sort(function (a, b) {
        return a.task.localeCompare(b.task);
      }));
    } else {
      this.sortIncreasing = true;
      this.categoryService.categories.forEach(category => category.elements.sort(function (a, b) {
        return b.task.localeCompare(a.task);
      }));
    }

    this.categoryService.saveCategories();
  }

  public changeCategory() {
    const index = this.categoryService.categories.map(function (e) { return e.name; }).indexOf(this.categoryInputField);

    if (index >= 0) {
      this.selectedCategory = this.categoryService.categories[index];
      this.currentCategoryIndex = index;
    }
    this.generateSuggestion();
  }
}