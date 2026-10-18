import {Message, message} from '../../i18n/language-pack';
import {LocalizationService} from '../../i18n/localization.service';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
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
import {CookingModeComponent, CookingSlide} from '../cooking-mode/cooking-mode.component';
import {RecipeStep} from '../models/recipe-step';
import {Category} from '../../category/category.dto';
import {Ingredient} from '../../ingredients/ingredient.dto';
import {Label} from '../../label/models/label.dto';
import {LabelService} from '../../label/label-service.service';
import {StockService, Availability, CookingPlan} from '../../domain/stock.service';
import {CatalogService} from '../../domain/catalog.service';
import {BaseUnit} from '../../domain/quantity';

@Component({
  selector: 'app-recipe-display',
  templateUrl: './recipe-display.component.html',
  styleUrls: ['./recipe-display.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CookingModeComponent,
    FormsModule,
    RouterModule,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonModal,
    IonTitle,
    IonToolbar,
  ],
})
export class RecipeDisplayComponent implements OnInit, OnDestroy {
  public readonly i18n = inject(LocalizationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private recipeService = inject(RecipeService);
  private categoryService = inject(CategoryService);
  private labelService = inject(LabelService);
  private stock = inject(StockService);
  private catalog = inject(CatalogService);
  private toastCtrl = inject(ToastController);
  private cdr = inject(ChangeDetectorRef);
  private subscriptions = new Subscription();
  private initialized = false;
  private availabilityVersion = 0;
  private ingredientAvailability = new Map<string, Availability>();
  public availabilityPending = true;
  public recipeMissing = false;
  public cookReviewOpen = false;
  public cookReviewLoading = false;
  public cooking = false;
  public cookReview: CookingPlan | null = null;
  public cookReviewMessage: Message = '';
  public cookingModeOpen = false;
  public cookingModeAnimated = true;
  public cookingSlides: CookingSlide[] = [];
  public cookingRecipeName = '';

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
      const recipe = this.recipeService.observeById(recipeId);
      const categories = this.categoryService.getCategories();
      const ingredients = this.recipeService.getIngredients(recipeId);
      const labels = this.labelService.getLabelsForRecipe(recipeId);

      this.subscriptions.add(combineLatest([recipe, categories, ingredients, labels]).subscribe(
        ([recipe, categories, ingredients, labels]) => {
          this.recipeMissing = !recipe;
          if (recipe) this._recipe = recipe;
          else this.closeCookingMode();
          this._categories = categories;
          this._ingredients = ingredients;
          this._labels = labels;

          if (this.categories.length > 0) {
            this.selectedCategoryId = this.categories[0].id;
          }
          this._isLoading = false;
          this.cdr.markForCheck();
        }
      ));
      this.subscriptions.add(this.recipeService.observeImageUrl(recipeId).subscribe(url => {
        if (this._imageUrl) URL.revokeObjectURL(this._imageUrl);
        this._imageUrl = url;
        this.cdr.markForCheck();
      }));
      this.subscriptions.add(combineLatest([ingredients, this.stock.observe(), this.catalog.observe()])
        .subscribe(([currentIngredients]) => {
          void this.refreshIngredientAvailability(currentIngredients);
        }));
    }
  }

  public ionViewWillEnter(): void {
    this.ngOnInit();
  }

  public ionViewWillLeave(): void {
    this.closeCookingMode();
    this.availabilityVersion++;
    this.subscriptions.unsubscribe();
    this.subscriptions = new Subscription();
    this.initialized = false;
    if (this._imageUrl) {
      URL.revokeObjectURL(this._imageUrl);
      this._imageUrl = null;
    }
  }

  public ngOnDestroy(): void {
    this.ionViewWillLeave();
  }

  public get steps(): RecipeStep[] {
    return this._recipe.steps ?? [];
  }

  public get canStartCooking(): boolean {
    return !this.recipeMissing && this.steps.length > 0 && this.steps.every(step => step.instructions.trim().length > 0);
  }

  public ingredientsForStep(step: RecipeStep): Ingredient[] {
    return this._ingredients.filter(ingredient => step.ingredientIds.includes(ingredient.id));
  }

  public openCookingMode(): void {
    if (!this.canStartCooking || this.cookingModeOpen || this.cookReviewOpen || this.cookReviewLoading) return;
    this.cookingSlides = this.steps.map(step => ({
      id: step.id,
      instructions: step.instructions,
      ingredients: this.ingredientsForStep(step).map(ingredient => ({...ingredient}))
    }));
    this.cookingRecipeName = this._recipe.name;
    this.cookingModeAnimated = !(typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);
    this.cookingModeOpen = true;
    this.cdr.markForCheck();
  }

  public closeCookingMode(): void {
    this.cookingModeOpen = false;
    this.cdr.markForCheck();
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
    if (availability.status === 'enough') return this.i18n.t('ui.available');
    if (availability.status === 'unknown') return this.i18n.t('ui.checkQuantity');
    return availability.available > 0 ? this.i18n.t('ui.needMore') : this.i18n.t('ui.missing');
  }

  public parseDate(recipe: Recipe): string {
    return this.i18n.duration(recipe.preparationTime);
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

  public async openCookReview(): Promise<void> {
    if (this.cookReviewLoading || this.cooking || this.cookingModeOpen || !this._recipe.id || !this._ingredients.length) return;
    this.cookReviewLoading = true;
    this.cookReviewMessage = '';
    this.cdr.markForCheck();
    try {
      this.cookReview = await this.stock.planCook(this._recipe.id);
      this.cookReviewOpen = true;
    } catch (error) {
      await this.showCookToast(this.i18n.error(error), 'danger');
    } finally {
      this.cookReviewLoading = false;
      this.cdr.markForCheck();
    }
  }

  public closeCookReview(): void {
    if (this.cooking) return;
    this.cookReviewOpen = false;
    this.cookReview = null;
    this.cookReviewMessage = '';
    this.cdr.markForCheck();
  }

  public async confirmCook(): Promise<void> {
    if (!this.cookReview || this.cooking) return;
    this.cooking = true;
    this.cookReviewMessage = '';
    this.cdr.markForCheck();
    try {
      const result = await this.stock.cook(this.cookReview.recipeId, this.cookReview);
      if (result.status === 'changed') {
        this.cookReview = result.plan;
        this.cookReviewMessage = 'ui.recipeOrStockChangedReviewTheUpdatedAmountsThenConfirmAgain';
      } else {
        this.closeCookReviewAfterSuccess();
        await this.showCookToast('ui.cookedStockUpdated', 'success');
      }
    } catch (error) {
      this.cookReviewMessage = this.i18n.error(error);
    } finally {
      this.cooking = false;
      this.cdr.markForCheck();
    }
  }

  private closeCookReviewAfterSuccess(): void {
    this.cookReviewOpen = false;
    this.cookReview = null;
    this.cookReviewMessage = '';
  }

  public displayAmount(amount: number): string {
    return this.i18n.number(Number(amount.toPrecision(6)), 6);
  }

  private async showCookToast(message: Message, color: 'success' | 'danger'): Promise<void> {
    const toast = await this.toastCtrl.create({message: this.i18n.t(message), duration: 2000, position: 'bottom', color});
    await toast.present();
  }

  private showExportSuccessToast(categoryName: string | undefined): void {
    this.toastCtrl
      .create({
        message: categoryName
          ? this.i18n.t('recipe.exported', {name: categoryName})
          : this.i18n.t('ui.ingredientsAddedToShoppingList'),
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
