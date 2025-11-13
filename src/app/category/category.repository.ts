import {Injectable} from "@angular/core";
import {Category, RxCategory} from "./category";
import {Preferences} from "@capacitor/preferences";
import Optional from "../util/optional";
import {Observable, catchError, from, map, of, switchMap, take, tap} from "rxjs";
import {DatabaseService} from "../database/database";
import {createRxDatabase, RxDatabase, RxDocument} from "rxdb";
import {wrappedValidateAjvStorage} from "rxdb/plugins/validate-ajv";
import {getRxStorageLocalstorage} from "rxdb/plugins/storage-localstorage";

@Injectable({
  providedIn: 'root'
})
export class CategoryRepository {

  constructor(private database: DatabaseService) {
  }

  public async saveOrUpdateCategory(category: RxCategory): Promise<RxDocument> {
    const db = await this.database.getDb();
    const collection = db['categories'];

    const existingDoc: RxDocument = await collection.findOne(category.id).exec();
    if (existingDoc) {
      await existingDoc.incrementalPatch(category);
      return existingDoc;
    } else {
      return await collection.insert(category);
    }
  }


  private CATEGORY_IDENTIFIER: string = 'categories';
  private LAST_CATEGORY_INDEX: string = 'last-category';

  public save(category: Category): Observable<void> {
    this.findAll().subscribe(
      (categories) => {
        console.log('Existing categories:', categories);
        categories = categories || []; // Ensure it's an array
        const index = categories.findIndex((cat) => cat.id === category.id);
        if (index !== -1) {
          categories[index] = category; // Update existing category
        } else {
          categories.push(category); // Add new category
        }
        console.log('Updated categories before saving:', categories);
        this.saveAll(categories).subscribe();
        return categories;
      });
    return of();

    //         if (index !== -1) {
    //             categories[index] = category; // Update existing category
    //         } else {
    //             categories.push(category); // Add new category
    //         }
    //         console.log('Updated categories before saving:', categories);
    //         return categories;
    //     }),
    //     switchMap((updatedCategories) => {
    //         const jsonValue = JSON.stringify(updatedCategories);
    //         console.log('Saving categories JSON:', jsonValue);
    //         return from(Preferences.set({ key: this.CATEGORY_IDENTIFIER, value: jsonValue }));
    //     }),
    //     tap(() => console.log('Save operation completed')),
    //     catchError((error) => {
    //         console.error('Error saving category:', error);
    //         return of(); // Return empty observable to avoid breaking the stream
    //     })
    // );
  }

  public saveAll(categories: Category[]): Observable<void> {
    console.log('Saving all categories:', categories);
    return from(Preferences.set({key: this.CATEGORY_IDENTIFIER, value: JSON.stringify(categories)}));
  }

  public saveLastCategory(index: number): Observable<void> {
    return from(Preferences.set({key: this.LAST_CATEGORY_INDEX, value: JSON.stringify(index)}));
  }

  public findCategoryById(id: string): Observable<Optional<Category>> {
    return this.findAll().pipe(
      map((categories) => categories.find((cat) => cat.id === id)),
      map((category) => category ? Optional.of(category) : Optional.empty())
    );
  }

  public findAll(): Observable<Category[]> {
    return from(Preferences.get({key: this.CATEGORY_IDENTIFIER})).pipe(
      map(({value}) => (value ? JSON.parse(value) : []) as Category[]),
      catchError((error) => {
        console.error('Error getting categories:', error);
        return of([]);
      })
    );
  }

  public getLastCategory(): Observable<number> {
    return from(Preferences.get({key: this.LAST_CATEGORY_INDEX})).pipe(
      map(({value}) => (value ? JSON.parse(value) : 0) as number)
    );
  }

  public deleteAllCategories(): Observable<void> {
    const promise1 = Preferences.remove({key: this.CATEGORY_IDENTIFIER});
    const promise2 = Preferences.remove({key: this.LAST_CATEGORY_INDEX});
    return from(Promise.all([promise1, promise2])).pipe(map(() => void 0));
  }

  public deleteCategory(id: string): void {
    this.findAll().subscribe((categories) => {
      const filteredCategories = categories.filter((cat) => cat.id !== id);
      Preferences.set({key: this.CATEGORY_IDENTIFIER, value: JSON.stringify(filteredCategories)});
    });
  }
}
