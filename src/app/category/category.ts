import { ToDo } from "../todo/todo";

export interface Category {
    name: string,
    elements: ToDo[],
    suggestions: string[]
    saveSuggestions: boolean
}