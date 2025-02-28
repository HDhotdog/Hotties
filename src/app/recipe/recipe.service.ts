import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { Recipe } from './models/recipe.interface';

@Injectable({
    providedIn: 'root'
})
export class RecipeService {

    private RECIPE_STORAGE: string = 'recipes';
    public recipes: Recipe[] = [];

    constructor() {
    }

    public async saveRecipes() {
        Preferences.set({ key: this.RECIPE_STORAGE, value: JSON.stringify(this.recipes) });
    }

    public async loadRecipes() {
        const { value } = await Preferences.get({ key: this.RECIPE_STORAGE })
        this.recipes = (value ? JSON.parse(value) : []) as Recipe[];
    }

    public async clearRecipes() {
        this.recipes.length = 0;
        Preferences.remove({ key: this.RECIPE_STORAGE })
    }
}
