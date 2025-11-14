import {Injectable} from "@angular/core";
import {RxToDo} from "./rxToDo";
import {DatabaseService} from "../database/database";
import {AbstractRepository} from "../database/abstract-repository";
import {Observable, switchMap} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class TodoRepository extends AbstractRepository<RxToDo> {
  protected override collectionName: string = "todos";

  constructor(protected override database: DatabaseService) {
    super(database);
  }

  public findByCategoryId(categoryId: string): Observable<RxToDo[]> {
    return this.getCollection().pipe(
      switchMap(col =>
        col.find({
          selector: {categoryId}
        }).$
      )
    );
  }
}
