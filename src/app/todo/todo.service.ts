import { Injectable, inject } from '@angular/core';
import { TodoRepository } from './todo.repository';
import { forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { Todo } from './todo.dto';
import { toTodo, toRxToDo } from './todo.mapper';
import { ItemService } from '../item/item.service';
import { Item } from '../item/models/item.dto';
import { AmountUnit } from '../shared/amount-unit.enum';

@Injectable({
  providedIn: 'root',
})
export class TodoService {
  private todoRepository = inject(TodoRepository);
  private itemService = inject(ItemService);

  public save(todo: Todo): Observable<Todo> {
    return this.resolveItem(todo).pipe(
      switchMap((item) => this.todoRepository.save(toRxToDo(this.linkToItem(todo, item))).pipe(map(toTodo)))
    );
  }

  public saveAll(todos: Todo[]): Observable<unknown> {
    if (todos.length === 0) {
      return of([]);
    }
    return forkJoin(
      todos.map((todo) => this.resolveItem(todo).pipe(map((item) => this.linkToItem(todo, item))))
    ).pipe(switchMap((linkedTodos) => this.todoRepository.saveAll(linkedTodos.map(toRxToDo))));
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

  /**
   * Reuses the already-linked item, or finds/creates one by the todo's name.
   * A brand-new item defaults to `Packung` here, since items reaching the
   * shopping list are bought as whole packages.
   */
  private resolveItem(todo: Todo): Observable<Item> {
    if (todo.itemId) {
      return this.itemService.findById(todo.itemId);
    }
    return this.itemService.findOrCreateByName(todo.name, AmountUnit.PACKAGE);
  }

  /** type/amount always mirror the linked item - they're no longer chosen per-todo. */
  private linkToItem(todo: Todo, item: Item): Todo {
    return { ...todo, itemId: item.id, type: item.type, amount: item.unit };
  }
}
