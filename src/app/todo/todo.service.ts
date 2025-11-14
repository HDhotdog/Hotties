import {Injectable} from '@angular/core';
import {RxToDo} from './rxToDo';
import {TodoRepository} from "./todo.repository";
import {Observable} from "rxjs";

@Injectable({
    providedIn: 'root'
})
export class TodoService {
    constructor(private todoRepository: TodoRepository) {
    }

    public save(todo: RxToDo): Observable<RxToDo> {
      return this.todoRepository.save(todo)
    }

    public findAll(): Observable<RxToDo[]> {
      return this.todoRepository.findAll();
    }

    public findByCategoryId(categoryId: string): Observable<RxToDo[]> {
      return this.todoRepository.findByCategoryId(categoryId);
    }

    public deleteById(id: string): Observable<boolean> {
      return this.todoRepository.deleteById(id);
    }

    public deleteAll(): Observable<number> {
      return this.todoRepository.deleteAll();
    }
}
