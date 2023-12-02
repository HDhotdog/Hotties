import { Component } from '@angular/core';
import { TodoService } from './todo.service';
import { ToDo } from './todo.service';
import { Suggestion, SuggestionService } from '../suggestion/suggestion.service';

@Component({
  selector: 'app-todo',
  templateUrl: 'todo.component.html',
  styleUrls: ['todo.component.scss']
})
export class TodoComponent {

  private _currentText = "";
  public inputField: string = "";
  public currentSuggestion: Suggestion = {suggestion: "Cookies", suffix: "! :D"};
  public todoService: TodoService;
  private suggestionService: SuggestionService;
  private suggestion_suffixes: string[] = [
    "?", "!", " :O", " O:", " owo", " c:", " OwO", " uwu", " :o", " o:", " :D"
  ]

  constructor(todoService: TodoService, suggestionService: SuggestionService) {
    this.todoService = todoService;
    this.suggestionService = suggestionService;
  }

  async ngOnInit() {
    await this.todoService.loadTodos();
    await this.suggestionService.loadSuggestions();
  }

  public addTodo(task: string) {
    if (task.trim()) {
      this.todoService.todos.push({
        task: task,
        done: false
      });
      this.saveSuggestion(task);
    } else if (!task) {
      this.todoService.todos.push({
        task: this.currentSuggestion.suggestion,
        done: false
      });
    }
    this.inputField = "";
    this.todoService.saveTodos();
    this.generateSuggestion();
  }

  public clearTodos() {
    this.todoService.todos.forEach(todo => todo.done = true)
    setTimeout(() => {
      this.todoService.todos = [];
      this.todoService.saveTodos();
    }, 1100);
  }

  public markAsDone(todo: ToDo) {
    const index = this.todoService.todos.indexOf(todo);
    this.todoService.todos[index].done = true;
    setTimeout(() => {
      this.todoService.todos.splice(index, 1);
      this.todoService.saveTodos();
    }, 1100);
  }

  public generateSuggestion(): void {

    if (this.suggestionService.suggestions.length == 0) {
      this.suggestionService.suggestions.push("Cookies");
    }

    const suggestion = this.suggestionService.suggestions[Math.floor(Math.random() * this.suggestionService.suggestions.length)];
    const suffix = this.suggestion_suffixes[Math.floor(Math.random() * this.suggestion_suffixes.length)];
    this.currentSuggestion = {
      suggestion: suggestion,
      suffix: suffix
    }
  }

  private saveSuggestion(text: string) {
    console.log( this.suggestionService.suggestions
      .filter((sugg) => sugg.toLowerCase() == text.trim().toLowerCase()));
    const included: boolean = this.suggestionService.suggestions
      .filter((sugg) => sugg.toLowerCase() == text.trim().toLowerCase()).length > 0

    if (!included) {
      this.suggestionService.suggestions.push(text);
      this.suggestionService.saveSuggestions();
    }
  }



  public set currentText(text: string) {
    this.currentText = text;
  }

  public get currentText() {
    return this._currentText;
  }

  public get getCurrentSuggestion() {
    return this.currentSuggestion.suggestion + this.currentSuggestion.suffix;
  }
}