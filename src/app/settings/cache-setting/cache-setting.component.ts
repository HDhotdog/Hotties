import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { SuggestionService } from 'src/app/suggestion/suggestion.service';
import { TodoService } from 'src/app/todo/todo.service';
import { Location } from '@angular/common';

@Component({
  selector: 'app-cache-setting',
  templateUrl: './cache-setting.component.html',
  styleUrls: ['./cache-setting.component.scss'],
})
export class CacheSettingComponent implements OnInit {

  constructor(private todoService: TodoService,
    private suggestionService: SuggestionService,
    private location: Location) {
  }

  ngOnInit() {
  }

  public clearTodoCache() {
    this.todoService.todos = [];
    this.todoService.clearTodos();
  }

  public clearSuggestionCache() {
    this.suggestionService.suggestions = [];
    this.suggestionService.clearSuggestions();
  }

  public navigateBack() {
    this.location.back()
  }
}
