import {Injectable} from "@angular/core";
import {Recipe} from "./models/recipe.interface";
import {Preferences} from "@capacitor/preferences";
import {catchError, from, map, Observable, of, switchMap, take} from "rxjs";

@Injectable({
    providedIn: 'root'
})
export class RecipeRepository {

    private readonly RECIPE_STORAGE: string = 'recipes';

    constructor() {
    }

    public saveAll(recipes: Recipe[]): Observable<void> {
        return from(Preferences.set({ key: this.RECIPE_STORAGE, value: JSON.stringify(recipes) }));
    }


    public save(recipe: Recipe): Observable<void> {
        return this.findAll().pipe(
            take(1),
            map((recipes) => {
                recipes = recipes || [];
                const index = recipes.findIndex((rec) => rec.id === recipe.id);
                if (index !== -1) {
                    recipes[index] = recipe;
                } else {
                    recipes.push(recipe);
                }
                return recipes;
            }),
            switchMap((updatedRecipes) =>
                from(Preferences.set({ key: this.RECIPE_STORAGE, value: JSON.stringify(updatedRecipes) }))
            )
        );
    }

    public findAll(): Observable<Recipe[]> {
        return from(Preferences.get({key: this.RECIPE_STORAGE})).pipe(
            map(({value}) => (value ? JSON.parse(value) : []) as Recipe[]),
            catchError((error) => {
                console.error('Error getting recipes:', error);
                return of([]);
            })
        );
    }

    public findById(id: string): Observable<Recipe> {
        return this.findAll().pipe(
            map((recipes) => recipes.find((recipe) => recipe.id === id)!)
        );
    }

    public clearRecipes() {
        Preferences.remove({ key: this.RECIPE_STORAGE })
    }

    public deleteRecipe(id: string): Observable<void> {
        return this.findAll().pipe(
            take(1), // Ensure we only fetch the latest list once
            map((recipes) => recipes.filter((recipe) => recipe.id !== id)), // Remove the recipe
            switchMap((updatedRecipes) =>
                from(Preferences.set({ key: this.RECIPE_STORAGE, value: JSON.stringify(updatedRecipes) }))
            )
        );
    }
}
