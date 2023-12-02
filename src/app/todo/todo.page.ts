import { Component } from '@angular/core';
import { TodoService } from '../services/todo.service';
import { ToDo } from '../services/todo.service';

@Component({
  selector: 'app-todo',
  templateUrl: 'todo.page.html',
  styleUrls: ['todo.page.scss']
})
export class TodoComponent {

  private _currentText = "";
  public inputField: string = "";
  public todoService: TodoService;
  public suggestions: string[] = [
    "Cookies..?", "Pizza!", "Toast Hawaii :O", "Schoki O:", "Maultaschen owo", "Banána!", "Kartoffelpüree c:"
  ]

  constructor(todoService: TodoService) {
    this.todoService = todoService;
  }

  async ngOnInit() {
    await this.todoService.loadTodos();
  }

  public addTodo(task: string) {
    if (task.trim()) {
      this.todoService.todos.push({
        task: task,
        done: false
      });
    }
    this.inputField = "";
    this.todoService.saveTodos();
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

  getSuggestion(): string {
    return this.suggestions[Math.floor(Math.random() * this.suggestions.length)];
  }

  public set currentText(text: string) {
    this.currentText = text;
  }

  public get currentText() {
    return this._currentText;
  }
}