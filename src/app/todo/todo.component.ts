import { Component, OnInit, ViewChildren, QueryList, ElementRef, AfterViewInit } from '@angular/core';
import { Category } from '../category/category';
import { CategoryService } from '../category/category.service';
import { Suggestion } from './suggestion/suggestion';
import { ToDo, ImportanceLevel } from './todo';
import { IonicModule, GestureController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-todo',
  templateUrl: 'todo.component.html',
  styleUrls: ['todo.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class TodoComponent implements OnInit, AfterViewInit {
  @ViewChildren('todoItem', { read: ElementRef }) todoItems!: QueryList<ElementRef>;

  public inputField: string = "";
  public categoryInputField: string = "";
  public currentSuggestion: Suggestion = { suggestion: "Cookies", suffix: "! :D" };
  public sortIncreasing: boolean = true;
  public categoryService: CategoryService;
  public currentCategoryIndex: number = 0;
  public selectedCategory: Category = {} as Category;
  public showColorBar: boolean = true;
  public currentImportanceLevel: ImportanceLevel = ImportanceLevel.NORMAL;
  private suggestion_suffixes: string[] = [
    "?", "!", " :O", " O:", " owo", " c:", " OwO", " uwu", " :o", " o:", " :D"
  ]
  public isLoading: boolean = true;
  public importanceLevels = Object.keys(ImportanceLevel);
  public importanceColors: { [key: string]: string } = {
    [ImportanceLevel.LOW]: '#ffd700',
    [ImportanceLevel.NORMAL]: '#007bff',
    [ImportanceLevel.HIGH]: '#ff0000',
    [ImportanceLevel.VERY_HIGH]: '#ff00ff'
  };

  constructor(
    categoryService: CategoryService,
    private gestureCtrl: GestureController
  ) {
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
    const newTodo = {
      task: task.trim() ? task : this.currentSuggestion.suggestion,
      done: false,
      importance: this.currentImportanceLevel || ImportanceLevel.NORMAL
    };

    this.categoryService.categories[this.currentCategoryIndex].elements.push(newTodo);
    
    if (task.trim()) {
      this.saveSuggestion(task);
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
    console.log(this.categoryService.categories[this.currentCategoryIndex].elements)
    const todoIndex = this.categoryService.categories[this.currentCategoryIndex].elements.indexOf(todo);
    if (todoIndex === -1) return; // Todo not found
    
    this.categoryService.categories[this.currentCategoryIndex].elements.splice(todoIndex, 1);
    this.categoryService.saveCategories();
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

  public toggleColorBar() {
    this.showColorBar = !this.showColorBar;
  }

  public getTodoBackgroundColor(importance: ImportanceLevel) {
    return {
      '--indicator-color': this.importanceColors[importance] || this.importanceColors[ImportanceLevel.NORMAL]
    };
  }

  private getContrastColor(importance: ImportanceLevel): string {
    return [ImportanceLevel.HIGH, ImportanceLevel.VERY_HIGH].includes(importance) ? '#ffffff' : '#212529';
  }

  public getCircleColorBackground(color: string) {
    const importanceLevel = this.getCircleColor(color);
    return {'background-color': this.importanceColors[importanceLevel]};
  }

  public getCircleColor(color: string): ImportanceLevel {
    const enumEntries = Object.entries(ImportanceLevel);
    return enumEntries.filter(entry => entry.includes(color))[0][1];
  }

  public isCurrentLevel(color: string) {
    return this.currentImportanceLevel === this.getCircleColor(color)
  }

  public setCurrentImportanceLevel(level: string) {
    this.currentImportanceLevel = this.getCircleColor(level);
  }

  public getTodoState(todo: ToDo): string {
    return todo.done ? 'done' : 'active';
  }

  ngAfterViewInit() {
    this.todoItems.changes.subscribe(() => {
      this.todoItems.forEach(item => {
        const gesture = this.gestureCtrl.create({
          el: item.nativeElement,
          threshold: 15,
          gestureName: 'swipe',
          onMove: ev => {
            if (ev.deltaX > 0) {
              item.nativeElement.style.transform = `translateX(${ev.deltaX}px)`;
            }
          },
          onEnd: ev => {
            item.nativeElement.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            if (ev.deltaX > 50) {
              item.nativeElement.style.transform = 'translateX(100vw)';
              const wrapper = item.nativeElement.closest('.todo-wrapper');
              if (wrapper) {
                wrapper.classList.add('removing');
              }
              const todo = this.categoryService.categories[this.currentCategoryIndex].elements.find(
                t => t.task === item.nativeElement.textContent?.trim()
              );
              if (todo) {
                setTimeout(() => this.markAsDone(todo), 600);
              }
            } else {
              item.nativeElement.style.transform = 'translateX(0)';
            }
          }
        });
        gesture.enable();
      });
    });
  }
}
