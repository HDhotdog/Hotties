import { Injectable, inject } from '@angular/core';
import { TodoRepository } from './todo.repository';
import { map, Observable } from 'rxjs';
import { Todo } from './todo.dto';
import { toTodo, toRxToDo } from './todo.mapper';

@Injectable({
  providedIn: 'root',
})
export class TodoService {
  private todoRepository = inject(TodoRepository);

  public save(todo: Todo): Observable<Todo> {
    return this.todoRepository.save(toRxToDo(todo)).pipe(map(toTodo));
  }

  public saveAll(todos: Todo[]): Observable<unknown> {
    return this.todoRepository.saveAll(todos.map(toRxToDo));
  }

  public findAll(): Observable<Todo[]> {
    return this.todoRepository.findAll().pipe(map((docs) => docs.map(toTodo)));
  }

  public findByCategoryId(categoryId: string): Observable<Todo[]> {
    return this.todoRepository
      .findByCategoryId(categoryId)
      .pipe(map((docs) => docs.map(toTodo)));
  }

  public deleteById(id: string): Observable<boolean> {
    return this.todoRepository.deleteById(id);
  }

  public deleteAll(): Observable<number> {
    return this.todoRepository.deleteAll();
  }

  public deleteByCategoryId(categoryId: string): Observable<number> {
    return this.todoRepository.deleteByCategoryId(categoryId);
  }
}
