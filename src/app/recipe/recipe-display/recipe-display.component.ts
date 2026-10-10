import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonImg,
  IonModal,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';
import {ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnDestroy, OnInit,} from '@angular/core';
import {ActivatedRoute, Router, RouterModule} from '@angular/router';

import {RecipeService} from '../recipe.service';
import {Recipe} from '../models/recipe.dto';
import {CategoryService} from '../../category/category.service';
import {FormsModule} from '@angular/forms';
import {combineLatest, Subscription} from 'rxjs';
import {Category} from '../../category/category.dto';
import {Ingredient} from '../../ingredients/ingredient.dto';
import {Label} from '../../label/models/label.dto';
import {LabelService} from '../../label/label-service.service';
import {StockService, Availability} from '../../domain/stock.service';
import {CatalogService} from '../../domain/catalog.service';
import {BaseUnit} from '../../domain/quantity';

@Component({
  selector: 'app-recipe-display',
  templateUrl: './recipe-display.component.html',
  styleUrls: ['./recipe-display.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterModule,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonImg,
    IonModal,
    IonTitle,
    IonToolbar,
  ],
})
export class RecipeDisplayComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private recipeService = inject(RecipeService);
  private categoryService = inject(CategoryService);
  private labelService = inject(LabelService);
  private stock = inject(StockService);
  private catalog = inject(CatalogService);
  private toastCtrl = inject(ToastController);
  private cdr = inject(ChangeDetectorRef);
  private readonly subscriptions = new Subscription();
  private initialized = false;
  private availabilityVersion = 0;
  private ingredientAvailability = new Map<string, Availability>();
  public availabilityPending = true;

  private _recipe: Recipe = {} as Recipe;
  private _isLoading: boolean = true;
  private _selectedCategoryId!: string;
  private _categories: Category[] = [];
  private _ingredients: Ingredient[] = [];
  private _labels: Label[] = [];
  private _imageUrl: string | null = null;

  public ngOnInit(): void {
    if (!this.initialized && this.route.snapshot.paramMap.has('id')) {
      this.initialized = true;
      const recipeId: string = this.route.snapshot.paramMap.get('id')!;
      const recipe = this.recipeService.findById(recipeId);
      const categories = this.categoryService.getCategories();
      const ingredients = this.recipeService.getIngredients(recipeId);
      const labels = this.labelService.getLabelsForRecipe(recipeId);

      this.subscriptions.add(combineLatest([recipe, categories, ingredients, labels]).subscribe(
        ([recipe, categories, ingredients, labels]) => {
          this._recipe = recipe;
          this._categories = categories;
          this._ingredients = ingredients;
          this._labels = labels;

          if (this.categories.length > 0) {
            this.selectedCategoryId = this.categories[0].id;
          }
          this._isLoading = false;
          this.cdr.markForCheck();

          if (this._imageUrl) {
            URL.revokeObjectURL(this._imageUrl);
            this._imageUrl = null;
          }
          this.subscriptions.add(this.recipeService.getImageUrl(recipeId).subscribe((url) => {
            this._imageUrl = url;
            this.cdr.markForCheck();
          }));
        }
      ));
      this.subscriptions.add(combineLatest([ingredients, this.stock.observe(), this.catalog.observe()])
        .subscribe(([currentIngredients]) => {
          void this.refreshIngredientAvailability(currentIngredients);
        }));
    }
  }

  public ionViewWillEnter(): void {
    this.ngOnInit();
  }

  public ngOnDestroy(): void {
    this.availabilityVersion++;
    this.subscriptions.unsubscribe();
    if (this._imageUrl) {
      URL.revokeObjectURL(this._imageUrl);
    }
  }

  private async refreshIngredientAvailability(ingredients: Ingredient[]): Promise<void> {
    const version = ++this.availabilityVersion;
    this.availabilityPending = true;
    this.cdr.markForCheck();
    const results = await Promise.all(ingredients.map(async item => ({
      id: item.id,
      availability: item.targetNodeId
        ? await this.stock.availability(item.targetNodeId, {amount: item.amount, unit: item.unit as BaseUnit})
        : {status: 'unknown' as const, available: 0, unit: item.unit as BaseUnit}
    })));
    if (version !== this.availabilityVersion) return;
    this.ingredientAvailability = new Map(results.map(result => [result.id, result.availability]));
    this.availabilityPending = false;
    this.cdr.markForCheck();
  }

  public availabilityFor(item: Ingredient): Availability | undefined {
    return this.ingredientAvailability.get(item.id);
  }

  public availabilityLabel(availability: Availability): string {
    if (availability.status === 'enough') return 'Available';
    if (availability.status === 'unknown') return 'Check quantity';
    return availability.available > 0 ? 'Need more' : 'Missing';
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

  /** Resets the modal to the first available category. Call right before it opens. */
  public initExportModal(): void {
    this._selectedCategoryId = this._categories[0]?.id ?? '';
  }

  public selectCategory(category: Category): void {
    this._selectedCategoryId = category.id;
  }

  public get missingIngredients(): Ingredient[] {
    if (this.availabilityPending) return [];
    return this._ingredients.flatMap(item => {
      const availability = this.ingredientAvailability.get(item.id);
      if (availability?.status !== 'insufficient') return [];
      const amount = Math.max(0, item.amount - availability.available);
      return amount > 1e-9 ? [{...item, amount}] : [];
    });
  }

  public canConfirmExport(): boolean {
    return !!this._selectedCategoryId && this.missingIngredients.length > 0;
  }

  public confirmExport(): void {
    if (!this.canConfirmExport()) {
      return;
    }
    const categoryName = this._categories.find(
      (category) => category.id === this._selectedCategoryId
    )?.name;
    this.categoryService
      .addIngredientsToCategory(this._selectedCategoryId, this.missingIngredients)
      .subscribe(() => this.showExportSuccessToast(categoryName));
  }

  private showExportSuccessToast(categoryName: string | undefined): void {
    this.toastCtrl
      .create({
        message: categoryName
          ? `Ingredients added to ${categoryName}.`
          : 'Ingredients added to shopping list.',
        duration: 1500,
        position: 'bottom',
        color: 'success',
      })
      .then((toast) => toast.present());
  }

  public navigateBack(): void {
    // Explicit destination rather than Location.back() (see AddRecipeComponent for why).
    void this.router.navigate(['/tabs/recipe']);
  }

  public deleteRecipe(): void {
    this.recipeService.deleteById(this._recipe.id).subscribe(() => {
      void this.router.navigate(['../../'], {relativeTo: this.route});
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
