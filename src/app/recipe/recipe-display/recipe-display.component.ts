import {Component, OnInit, ViewChild} from '@angular/core';
import {ActivatedRoute, Router, RouterModule} from '@angular/router';
import {CommonModule, Location} from '@angular/common';
import {RecipeService} from '../recipe.service';
import {RxRecipe} from '../models/recipe';
import {CategoryService} from 'src/app/category/category.service';
import {IonicModule, IonSelect} from "@ionic/angular";
import {FormsModule} from '@angular/forms';
import {combineLatest} from 'rxjs';
import {RxCategory} from "../../category/category";
import {RxIngredient} from "../../ingredients/ingredient";
import {RxLabel} from "../../label/models/label";
import {LabelService} from "../../label/label-service.service";


@Component({
  selector: 'app-recipe-display',
  templateUrl: './recipe-display.component.html',
  styleUrls: ['./recipe-display.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, RouterModule]
})
export class RecipeDisplayComponent implements OnInit {

  constructor(private router: Router,
              private route: ActivatedRoute,
              private location: Location,
              private recipeService: RecipeService,
              private categoryService: CategoryService,
              private labelService: LabelService) {
  }

  private _recipe: RxRecipe = {} as RxRecipe;
  private _isLoading: boolean = true;
  private _selectedCategoryId!: string;
  private _categories: RxCategory[] = [];
  private _ingredients: RxIngredient[] = [];
  private _labels: RxLabel[] = [];

  @ViewChild("selectionList", { static: false })
  public selectionList!: IonSelect;

  public ngOnInit(): void {
    if (this.route.snapshot.paramMap.has('id')) {
      const recipeId: string =  this.route.snapshot.paramMap.get('id')!;
      const recipe = this.recipeService.findById(recipeId);
      const categories = this.categoryService.getCategories();
      const ingredients = this.recipeService.getIngredients(recipeId);
      const labels = this.labelService.getLabelsForRecipe(recipeId)

      combineLatest([recipe, categories, ingredients, labels]).subscribe(([recipe, categories, ingredients, labels]) => {
        this._recipe = recipe;
        this._categories = categories;
        this._ingredients = ingredients;
        this._labels = labels;

        if(this.categories.length > 0) {
          this.selectedCategoryId = this.categories[0].id;
        }
        this._isLoading = false;
      });
    }
  }

  public ionViewWillEnter(): void {
    this.ngOnInit();
  }

  public parseDate(recipe: RxRecipe): string {
    let hours = (recipe.preparationTime -  recipe.preparationTime % 60) / recipe.preparationTime;
    let minutes = recipe.preparationTime % 60;
    let date: string = "";
    if (hours > 0) {
      date += hours + "h "
    }
    if (minutes > 0) {
      date += minutes + "m"
    }
    return date.trim();
  }

  public saveIngredients() {
    if(this._selectedCategoryId) {
      this.categoryService.addIngredientsToCategory(this._selectedCategoryId, this._recipe!);
    }
  }

  public exportIngredients() {
    void this.selectionList.open();
  }


  public navigateBack(): void {
    this.location.back();
  }

  public deleteRecipe(): void {
    this.recipeService.deleteById(this._recipe.id).subscribe(() => {
      void this.router.navigate(['../../'], {relativeTo: this.route});
    });
}

  public editRecipe(): void {
    void this.router.navigate(['../../new', this._recipe.id], {relativeTo: this.route});
  }

  get recipe(): RxRecipe {
    return this._recipe;
  }

  get isLoading(): boolean {
    return this._isLoading;
  }

  get categories(): RxCategory[] {
    return this._categories;
  }

  get ingredients(): RxIngredient[] {
    return this._ingredients;
  }

  get labels(): RxLabel[] {
    return this._labels;
  }

  set selectedCategoryId(selectedCategoryId: string) {
    this._selectedCategoryId = selectedCategoryId;
  }

  get selectedCategoryId(): string {
    return this._selectedCategoryId;
  }
}
