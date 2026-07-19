import {ImportanceLevel} from "./importance-level.enum";

export interface RxToDo {
  id: string;
  categoryId: string;
  name: string;
  importance: ImportanceLevel,
  done: boolean
}
