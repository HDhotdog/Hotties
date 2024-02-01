import { Component, OnInit } from '@angular/core';
import { RecipeService } from './recipe.service';
import { Recipe } from './recipe';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-recipe',
  templateUrl: 'recipe.component.html',
  styleUrls: ['recipe.component.scss']
})
export class RecipeComponent implements OnInit {

  private _recipes: Recipe[] = [];
  public search: string = "";

  constructor(private recipeService: RecipeService, private router: Router, private route: ActivatedRoute) {}

  ngOnInit(): void {
      this.recipeService.loadRecipes();
      this._recipes = this.recipeService.recipes;
  }

  async ionViewWillEnter() {
    this.recipeService.loadRecipes();
    this._recipes = this.recipeService.recipes;
  }

  public parseDate(recipe: Recipe): string {
    let date: string = "";
    if (recipe.prepTimeHour > 0) {
      date += recipe.prepTimeHour + "h "
    }
    if (recipe.prepTimeMinutes > 0) {
      date += recipe.prepTimeMinutes + "m"
    }
    return date.trim();
  }

  get results(): Recipe[] {
    return this._recipes.filter((recipe) => recipe.name.toLowerCase().includes(this.search.toLowerCase()));
  }

  public openRecipe(recipe: Recipe): void {
    this.router.navigate(['display', recipe.uuid], {relativeTo: this.route})
  }

  public newRecipe() {
    this.router.navigate(['new'], {relativeTo: this.route})
  }
}
