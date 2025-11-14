import {Component, OnInit, ViewChild} from '@angular/core';
import {ActivatedRoute, Router, RouterModule} from '@angular/router';
import {Location, CommonModule} from '@angular/common';
import {RecipeService} from '../recipe.service';
import {Recipe} from '../models/recipe.interface';
import {CategoryService} from 'src/app/category/category.service';
import {IonSelect, IonicModule} from "@ionic/angular";
import {FormsModule} from '@angular/forms';
import { forkJoin } from 'rxjs';
import {RxCategory} from "../../category/category";


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

  private _recipe: Recipe = {} as Recipe;
  private _isLoading: boolean = true;
  private _selectedCategoryId!: string;
  private _categories: RxCategory[] = [];

  @ViewChild("selectionList", { static: false })
  public selectionList!: IonSelect;

  public ngOnInit(): void {
    if (this.route.snapshot.paramMap.has('id')) {
      const recipeId: string =  this.route.snapshot.paramMap.get('id')!;
      const recipe = this.recipeService.findById(recipeId);
      const categories = this.categoryService.getCategories();

      forkJoin([recipe, categories]).subscribe(([recipe, categories]) => {
        this._recipe = recipe;
        this._categories = categories;
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

  public saveIngredients() {
    if(this._selectedCategoryId) {
      this.categoryService.addIngredientsToCategory(this._selectedCategoryId, this._recipe!);
    }
  }

  public exportIngredients() {
    this.selectionList.open();
  }


  public navigateBack(): void {
    this.location.back();
  }

  public deleteRecipe(): void {
    this.recipeService.deleteRecipe(this._recipe.id).subscribe(() => {
      this.router.navigate(['../../'], {relativeTo: this.route});
    });
}

  public editRecipe(): void {
    this.router.navigate(['../../new', this._recipe.id], {relativeTo: this.route});
  }

  get recipe(): Recipe {
    return this._recipe;
  }

  get isLoading(): boolean {
    return this._isLoading;
  }

  get categories(): RxCategory[] {
    return this._categories;
  }

  set selectedCategoryId(selectedCategoryId: string) {
    this._selectedCategoryId = selectedCategoryId;
  }

  get selectedCategoryId(): string {
    return this._selectedCategoryId;
  }
}
