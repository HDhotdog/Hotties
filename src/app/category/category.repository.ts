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

  //deprecated
  // private LAST_CATEGORY_INDEX: string = 'last-category';

  // public saveLastCategory(index: number): Observable<void> {
  //   return from(Preferences.set({key: "1", value: JSON.stringify(index)}));
  // }

  // public findCategoryById(id: string): Observable<Optional<RxCategory>> {
  //   return this.findAll().pipe(
  //     map((categories) => categories.find((cat) => cat.id === id)),
  //     map((category) => category ? Optional.of(category) : Optional.empty())
  //   );
  // }
}
