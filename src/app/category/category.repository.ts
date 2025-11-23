import {Injectable} from "@angular/core";
import {RxCategory} from "./category";
import {DatabaseService} from "../database/database";
import {AbstractRepository} from "../database/abstract-repository";

@Injectable({
  providedIn: 'root'
})
export class CategoryRepository extends AbstractRepository<RxCategory> {
  protected override collectionName: string = "categories";

  constructor(protected override database: DatabaseService) {
    super(database);
  }
}
