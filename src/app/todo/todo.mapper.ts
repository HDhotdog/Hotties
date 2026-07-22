import {RxToDo} from './rxToDo';
import {Todo} from './todo.dto';

export function toTodo(doc: RxToDo): Todo {
  return {id: doc.id, categoryId: doc.categoryId, name: doc.name, type: doc.type, amount: doc.amount, done: doc.done};
}

export function toRxToDo(todo: Todo): RxToDo {
  return {id: todo.id, categoryId: todo.categoryId, name: todo.name, type: todo.type, amount: todo.amount, done: todo.done};
}
