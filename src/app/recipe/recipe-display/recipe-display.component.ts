import {Component, OnInit, ViewChild} from '@angular/core';
import {ActivatedRoute, Router, RouterModule} from '@angular/router';
import {Location, CommonModule} from '@angular/common';
import {RecipeService} from '../recipe.service';
import {Recipe} from '../models/recipe.interface';
import {CategoryService} from 'src/app/category/category.service';
import {IonSelect, IonicModule} from "@ionic/angular";
import {Category} from "../../category/category";
import {FormsModule} from '@angular/forms';


@Component({
  selector: 'app-recipe-display',
  templateUrl: './recipe-display.component.html',
  styleUrls: ['./recipe-display.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, RouterModule]
})
export class RecipeDisplayComponent implements OnInit {

  constructor(private router: Router, private route: ActivatedRoute, private location: Location,
              private recipeService: RecipeService, private categoryService: CategoryService) {
  }

  private _recipeUuid!: string;
  private _recipe!: Recipe;
  private _isLoading: boolean = true;
  private _selectedCategoryId!: string;
  private _categories: Category[] = [];

  @ViewChild("selectionList", { static: false })
  public selectionList!: IonSelect;

  async ngOnInit()  {
    if (this.route.snapshot.paramMap.has('id')) {
      this._recipeUuid = this.route.snapshot.paramMap.get('id')!;
      this.recipeService.loadRecipes();
      this._recipe = this.recipeService.recipes.find((recipe) => recipe.uuid === this._recipeUuid)!;
      this._isLoading = false;
    }

    this.categoryService.getCategories().subscribe((categories) => {
      this._categories = categories;
    });
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
    await this.categoryService.addIngredientsToCategory(this._selectedCategoryId, this._recipe!);
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
    return this._categories;
  }

  set selectedCategoryId(selectedCategoryId: string) {
    this._selectedCategoryId = selectedCategoryId;
  }

  get selectedCategoryId(): string {
    return this._selectedCategoryId;
  }
}
