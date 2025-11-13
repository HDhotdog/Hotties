import { ToDo } from "../todo/todo";
export interface Category {
    id: string,
    name: string,
    elements: ToDo[],
    suggestions: string[]
    saveSuggestions: boolean
}

export interface RxCategory {
  id: string,
  name: string,
  suggestions: string[]
  saveSuggestions: boolean
}
