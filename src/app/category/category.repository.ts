import { Injectable } from "@angular/core";
import { Category } from "./category";
import { Preferences } from "@capacitor/preferences";
import Optional from "../util/optional";
import { Observable, catchError, from, map, of } from "rxjs";

@Injectable({
    providedIn: 'root'
  })
export class CategoryRepository {

    private CATEGORY_IDENTIFIER: string = 'categories';
    private LAST_CATEGORY_INDEX: string = 'last-category';

    public save(category: Category) {
        this.getCategories().subscribe((categories) => {
            categories = categories || [];
            const index = categories.findIndex((cat) => cat.id === category.id);

            if (index !== -1) {
                categories[index] = category;
            } else {
                categories.push(category);
            }

            Preferences.set({ key: this.CATEGORY_IDENTIFIER, value: JSON.stringify(categories) })
                .then(() => console.log('Categories saved successfully!'))
                .catch((error) => console.error('Error saving categories:', error));
        });
    }

    public saveCategories(categories: Category[]) {
        categories.forEach((category) => {
            this.save(category);
        });
    }

    public saveLastCategory(index: number) {
        Preferences.set({key: this.LAST_CATEGORY_INDEX, value: JSON.stringify(index)});
    }

    public findCategoryById(id: string): Observable<Optional<Category>> {
        return this.getCategories().pipe(
            map((categories) => categories.find((cat) => cat.id === id)),
            map((category) => category ? Optional.of(category) : Optional.empty())
        );
    }

    public getCategories(): Observable<Category[]> {
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
        this.getCategories().subscribe((categories) => {
            const filteredCategories = categories.filter((cat) => cat.id !== id);
            Preferences.set({key: this.CATEGORY_IDENTIFIER, value: JSON.stringify(filteredCategories)});
        });
    }
}