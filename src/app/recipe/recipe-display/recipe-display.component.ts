import {Component, OnInit, ViewChild} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {Location} from '@angular/common';
import {RecipeService} from '../recipe.service';
import {Recipe} from '../models/recipe.interface';
import {CategoryService} from 'src/app/category/category.service';
import {IonSelect} from "@ionic/angular";
import {Category} from "../../category/category";


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
  public selectedCategoryName!: string;

  @ViewChild("selectionList", { static: false })
  public selectionList!: IonSelect;

  async ngOnInit()  {
    if (this.route.snapshot.paramMap.has('id')) {
      this._recipeUuid = this.route.snapshot.paramMap.get('id')!;
      this.recipeService.loadRecipes();
      this._recipe = this.recipeService.recipes.find((recipe) => recipe.uuid === this._recipeUuid)!;
      this._isLoading = false;
    }

    await this.categoryService.loadCategories();
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

  public async ok() {
    await this.categoryService.addIngredientsToCategory(this.selectedCategoryName, this._recipe!);
  }
  public exportIngredients() {
    this.selectionList.open();
  }


  public navigateBack(): void {
    this.location.back();
  }

  public deleteRecipe(): void {
    const index = this.recipeService.recipes.findIndex((recipe) => recipe.uuid === this._recipeUuid);
    this.recipeService.recipes.splice(index, 1);
    this.recipeService.saveRecipes().then(() => {
      this.router.navigate(['../../'], {relativeTo: this.route});
    });
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

  get categories(): Category[] {
    return this.categoryService.categories;
  }
}
