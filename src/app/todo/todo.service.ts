import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { ToDo } from './todo';

@Injectable({
    providedIn: 'root'
})
export class TodoService {

    private TODO_STORAGE: string = 'todos';
    public todos: ToDo[] = [];

    constructor() {
    }

    public async saveTodos() {
        Preferences.set({ key: this.TODO_STORAGE, value: JSON.stringify(this.todos) });
    }

    public async loadTodos() {
        const { value } = await Preferences.get({ key: this.TODO_STORAGE })
        this.todos = (value ? JSON.parse(value) : []) as ToDo[];
    }

    public async clearTodos() {
        this.todos.length = 0;
        Preferences.remove({ key: this.TODO_STORAGE })
    }
}
