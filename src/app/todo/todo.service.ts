import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

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
        Preferences.remove({ key: this.TODO_STORAGE })
    }
}


export interface ToDo {
    task: string
    done: boolean
}
