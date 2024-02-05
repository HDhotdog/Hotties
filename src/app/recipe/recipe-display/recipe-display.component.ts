import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {Location} from '@angular/common';
import {RecipeService} from '../recipe.service';
import {Recipe} from '../recipe';
import {CategoryService} from 'src/app/category/category.service';


@Component({
  selector: 'app-recipe-display',
  templateUrl: './recipe-display.component.html',
  styleUrls: ['./recipe-display.component.scss'],
})
export class RecipeDisplayComponent implements OnInit {

  constructor(private router: Router, private route: ActivatedRoute, private location: Location,
              private recipeService: RecipeService, private categoryService: CategoryService) {
  }

  private _recipeUuid!: string;
  private _recipe!: Recipe;
  private _isLoading: boolean = true;

  ngOnInit(): void {
    if (this.route.snapshot.paramMap.has('id')) {
      this._recipeUuid = this.route.snapshot.paramMap.get('id')!;
      this.recipeService.loadRecipes();
      this._recipe = this.recipeService.recipes.find((recipe) => recipe.uuid === this._recipeUuid)!;
      this._isLoading = false;
    }
  }

  async ionViewWillEnter() {
    if (this.route.snapshot.paramMap.has('id')) {
      this._recipeUuid = this.route.snapshot.paramMap.get('id')!;
      this.recipeService.loadRecipes();
      this._recipe = this.recipeService.recipes.find((recipe) => recipe.uuid === this._recipeUuid)!;
    }
  }


  public parseDate(): string {
    let date: string = "";
    if (this._recipe!.prepTimeHour > 0) {
      date += this._recipe!.prepTimeHour + "h "
    }
    if (this.recipe!.prepTimeMinutes > 0) {
      date += this._recipe!.prepTimeMinutes + "m"
    }
    return date.trim();
  }

  public exportIngredients() {
    this.categoryService.createCategory(this._recipe);
  }


  public navigateBack(): void {
    this.location.back();
  }

  public editRecipe(): void {
    this.router.navigate(['../../new', this._recipeUuid], {relativeTo: this.route});
  }

  get recipe(): Recipe {
    return this._recipe;
  }

  get isLoading(): boolean {
    return this._isLoading;
  }
}
