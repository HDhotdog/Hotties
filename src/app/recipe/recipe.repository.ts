import { Injectable } from "@angular/core";
import { Recipe } from "./models/recipe.interface";
import { Preferences } from "@capacitor/preferences";
import { catchError, of, Observable, map, from } from "rxjs";
import { Category } from "../category/category";

@Injectable({
    providedIn: 'root'
})
export class RecipeRepository {

    private readonly RECIPE_STORAGE: string = 'recipes';

    constructor() {
    }

    public saveAll(recipes: Recipe[]) {
        Preferences.set({ key: this.RECIPE_STORAGE, value: JSON.stringify(recipes) })
        .then(() => console.log('Recipes saved successfully!'))
        .catch((error) => console.error('Error saving recipes:', error));
    }


    public save(recipe: Recipe) {
        this.findAll().subscribe((recipes) => {
            recipes = recipes || [];
            const index = recipes.findIndex((rec) => rec.id === recipe.id);

            if (index !== -1) {
                recipes[index] = recipe;
            } else {
                recipes.push(recipe);
            }

            Preferences.set({ key: this.RECIPE_STORAGE, value: JSON.stringify(recipes) })
                .then(() => console.log('Recipes saved successfully!'))
                .catch((error) => console.error('Error saving recipes:', error));
        });
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

    public deleteRecipe(id: string) {
        this.findAll().pipe(
            map((recipes) => recipes.filter((recipe) => recipe.id !== id))
        ).subscribe((recipes) => this.saveAll(recipes));
    }
}