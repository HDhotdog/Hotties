import { Injectable } from '@angular/core';
import { Recipe } from './models/recipe.interface';
import { RecipeRepository } from './recipe.repository';
import { map, Observable } from 'rxjs';
@Injectable({
    providedIn: 'root'
})
export class RecipeService {

    constructor(private recipeRepository: RecipeRepository) {}

    public saveAll(recipes: Recipe[]) {
        this.recipeRepository.saveAll(recipes);
    }

    public save(recipe: Recipe) {
        this.recipeRepository.save(recipe);
    }

    public findAll(): Observable<Recipe[]> {
        return this.recipeRepository.findAll();
    }

    public findById(id: string): Observable<Recipe> {
        return this.recipeRepository.findById(id);
    }

    public clearRecipes() {
        this.recipeRepository.clearRecipes();
    }

    public deleteRecipe(id: string) {
        this.recipeRepository.deleteRecipe(id);
    }
}
