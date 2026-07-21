import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { RecipeService } from '../recipe.service';
import { Recipe } from '../models/recipe.dto';
import { CategoryService } from '../../category/category.service';
import { IonicModule, IonSelect } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { combineLatest } from 'rxjs';
import { Category } from '../../category/category.dto';
import { Ingredient } from '../../ingredients/ingredient.dto';
import { Label } from '../../label/models/label.dto';
import { LabelService } from '../../label/label-service.service';

@Component({
  selector: 'app-recipe-display',
  templateUrl: './recipe-display.component.html',
  styleUrls: ['./recipe-display.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [IonicModule, FormsModule, RouterModule],
})
export class RecipeDisplayComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private recipeService = inject(RecipeService);
  private categoryService = inject(CategoryService);
  private labelService = inject(LabelService);

  private _recipe: Recipe = {} as Recipe;
  private _isLoading: boolean = true;
  private _selectedCategoryId!: string;
  private _categories: Category[] = [];
  private _ingredients: Ingredient[] = [];
  private _labels: Label[] = [];
  private _imageUrl: string | null = null;

  @ViewChild('selectionList', { static: false })
  public selectionList!: IonSelect;

  public ngOnInit(): void {
    if (this.route.snapshot.paramMap.has('id')) {
      const recipeId: string = this.route.snapshot.paramMap.get('id')!;
      const recipe = this.recipeService.findById(recipeId);
      const categories = this.categoryService.getCategories();
      const ingredients = this.recipeService.getIngredients(recipeId);
      const labels = this.labelService.getLabelsForRecipe(recipeId);

      combineLatest([recipe, categories, ingredients, labels]).subscribe(
        ([recipe, categories, ingredients, labels]) => {
          this._recipe = recipe;
          this._categories = categories;
          this._ingredients = ingredients;
          this._labels = labels;

          if (this.categories.length > 0) {
            this.selectedCategoryId = this.categories[0].id;
          }
          this._isLoading = false;

          if (this._imageUrl) {
            URL.revokeObjectURL(this._imageUrl);
            this._imageUrl = null;
          }
          this.recipeService.getImageUrl(recipeId).subscribe((url) => {
            this._imageUrl = url;
          });
        }
      );
    }
  }

  public ionViewWillEnter(): void {
    this.ngOnInit();
  }

  public ngOnDestroy(): void {
    if (this._imageUrl) {
      URL.revokeObjectURL(this._imageUrl);
    }
  }

  public parseDate(recipe: Recipe): string {
    let hours = (recipe.preparationTime - (recipe.preparationTime % 60)) / 60;
    let minutes = recipe.preparationTime % 60;
    let date: string = '';
    if (hours > 0) {
      date += hours + 'h ';
    }
    if (minutes > 0) {
      date += minutes + 'm';
    }
    return date.trim();
  }

  public saveIngredients() {
    if (this._selectedCategoryId) {
      this.categoryService
        .addIngredientsToCategory(this._selectedCategoryId, this._ingredients)
        .subscribe();
    }
  }

  public exportIngredients() {
    void this.selectionList.open();
  }

  public navigateBack(): void {
    // Explicit destination rather than Location.back() (see AddRecipeComponent for why).
    void this.router.navigate(['/tabs/recipe']);
  }

  public deleteRecipe(): void {
    this.recipeService.deleteById(this._recipe.id).subscribe(() => {
      void this.router.navigate(['../../'], { relativeTo: this.route });
    });
  }

  public editRecipe(): void {
    void this.router.navigate(['../../new', this._recipe.id], {
      relativeTo: this.route,
    });
  }

  get recipe(): Recipe {
    return this._recipe;
  }

  get imageUrl(): string | null {
    return this._imageUrl;
  }

  get isLoading(): boolean {
    return this._isLoading;
  }

  get categories(): Category[] {
    return this._categories;
  }

  get ingredients(): Ingredient[] {
    return this._ingredients;
  }

  get labels(): Label[] {
    return this._labels;
  }

  set selectedCategoryId(selectedCategoryId: string) {
    this._selectedCategoryId = selectedCategoryId;
  }

  get selectedCategoryId(): string {
    return this._selectedCategoryId;
  }
}
