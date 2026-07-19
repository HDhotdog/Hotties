import {ImportanceLevel} from "./importance-level.enum";

/** UI-facing todo model, distinct from the RxDB document shape (`RxToDo`). */
export interface Todo {
  id: string;
  categoryId: string;
  name: string;
  importance: ImportanceLevel;
  done: boolean;
}
