import {
  IonButton,
  IonButtons,
  IonCheckbox,
  IonContent,
  IonHeader,
  IonIcon,
  IonImg,
  IonLabel,
  IonMenu,
  IonRange,
  IonSearchbar,
  IonTitle,
  IonToolbar,
  MenuController,
} from '@ionic/angular';
import {ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnDestroy, OnInit,} from '@angular/core';
import {RecipeService} from './recipe.service';
import {Recipe} from './models/recipe.dto';
import {Label, LabelGroup} from '../label/models/label.dto';
import {ActivatedRoute, Router, RouterModule} from '@angular/router';
import {LabelService} from '../label/label-service.service';
import {StockService} from '../domain/stock.service';
import {BaseUnit} from '../domain/quantity';
import {CatalogService} from '../domain/catalog.service';

import {FormsModule} from '@angular/forms';
import {combineLatest, firstValueFrom, forkJoin, map, Observable} from 'rxjs';
import {take} from 'rxjs/operators';
import {
  filterRecipes,
  labelsForGroup as getLabelsForGroup,
  labelsForRecipe as getLabelsForRecipe,
} from './recipe-filter';

export interface IngredientAvailability {
  total: number;
  available: number;
  unknown: number;
}

@Component({
  selector: 'app-recipe',
  templateUrl: 'recipe.component.html',
  styleUrls: ['recipe.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterModule,
    IonButton,
    IonButtons,
    IonCheckbox,
    IonContent,
    IonHeader,
    IonIcon,
    IonImg,
    IonLabel,
    IonMenu,
    IonRange,
    IonSearchbar,
    IonTitle,
    IonToolbar,
  ],
})
export class RecipeComponent implements OnInit, OnDestroy {
  private recipeService = inject(RecipeService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  labelService = inject(LabelService);
  private menuController = inject(MenuController);
  private stock = inject(StockService);
  private catalog = inject(CatalogService);
  private cdr = inject(ChangeDetectorRef);

  private _recipes: Recipe[] = [];
  private _labels: Label[] = [];
  private _labelGroups: LabelGroup[] = [];

  private _setFilters: Label[] = [];
  public search: string = '';
  public selectedTime: number | null = null;
  public results: Recipe[] = [];

  private imageUrls = new Map<string, string>();
  private ingredientAvailability = new Map<string, IngredientAvailability>();
  private availabilityVersion = 0;

  public openMainMenu(): void {
    this.menuController.open('main-menu');
  }

  ngOnInit(): void {
    const recipesObs: Observable<Recipe[]> = this.recipeService.findAll();
    const labelsObs: Observable<Label[]> = this.labelService.getAllLabels();
    const labelGroupsObs: Observable<LabelGroup[]> =
      this.labelService.getAllLabelGroups();
    const stockObs = this.stock.observe();
    const catalogObs = this.catalog.observe();
    combineLatest([recipesObs, labelsObs, labelGroupsObs, stockObs, catalogObs]).subscribe(
      ([recipes, labels, labelGroups]) => {
        this._recipes = recipes;
        this._labels = labels;
        this._labelGroups = labelGroups;
        this.filterRecipes();
        this.cdr.markForCheck();
        this.loadImages(recipes);

        void this.loadIngredientAvailability(recipes);
      }
    );
  }

  ionViewWillEnter(): void {
    this.ngOnInit();
  }

  ngOnDestroy(): void {
    this.revokeImageUrls();
  }

  private loadImages(recipes: Recipe[]): void {
    if (recipes.length === 0) {
      this.revokeImageUrls();
      this.imageUrls = new Map();
      this.cdr.markForCheck();
      return;
    }

    forkJoin(
      recipes.map((recipe) =>
        this.recipeService
          .getImageUrl(recipe.id)
          .pipe(map((url) => ({id: recipe.id, url})))
      )
    ).subscribe((results) => {
      this.revokeImageUrls();
      const newImageUrls = new Map<string, string>();
      results.forEach(({id, url}) => {
        if (url) {
          newImageUrls.set(id, url);
        }
      });
      this.imageUrls = newImageUrls;
      this.cdr.markForCheck();
    });
  }

  private revokeImageUrls(): void {
    this.imageUrls.forEach((url) => URL.revokeObjectURL(url));
  }

  public imageUrlFor(recipeId: string): string | undefined {
    return this.imageUrls.get(recipeId);
  }

  /**
   * Only sufficient measured stock counts as available. Unknown conversions
   * never claim an ingredient is ready.
   */
  private async loadIngredientAvailability(recipes: Recipe[]): Promise<void> {
    const version = ++this.availabilityVersion;
    if (recipes.length === 0) {
      this.ingredientAvailability = new Map();
      this.cdr.markForCheck();
      return;
    }

    const results = await Promise.all(recipes.map(async recipe => {
      const ingredients = await firstValueFrom(this.recipeService.getIngredients(recipe.id).pipe(take(1)));
      const statuses = await Promise.all(ingredients.map(ingredient => ingredient.targetNodeId
        ? this.stock.availability(ingredient.targetNodeId, {
          amount: ingredient.amount,
          unit: ingredient.unit as BaseUnit
        })
        : Promise.resolve({status: 'unknown' as const})));
      return {
        id: recipe.id, total: ingredients.length,
        available: statuses.filter(status => status.status === 'enough').length,
        unknown: statuses.filter(status => status.status === 'unknown').length
      };
    }));
    if (version === this.availabilityVersion) {
      const availability = new Map<string, IngredientAvailability>();
      results.forEach(({id, total, available, unknown}) => availability.set(id, {total, available, unknown}));
      this.ingredientAvailability = availability;
      this.cdr.markForCheck();
    }
  }

  public ingredientAvailabilityFor(recipeId: string): IngredientAvailability | undefined {
    return this.ingredientAvailability.get(recipeId);
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

  public changeFilter(event: Event, label: Label) {
    if ((event.target as HTMLIonCheckboxElement).checked) {
      this._setFilters.push(label);
    } else {
      this._setFilters.splice(this._setFilters.indexOf(label), 1);
    }
    this.filterRecipes();
  }

  public filterRecipes(): void {
    this.results = filterRecipes(
      this._recipes,
      this._labels,
      this.search,
      this._setFilters,
      this.selectedTime
    );
  }

  public openRecipe(recipe: Recipe): void {
    this.router.navigate(['display', recipe.id], {relativeTo: this.route});
  }

  public newRecipe() {
    this.router.navigate(['new'], {relativeTo: this.route});
  }

  async openFilterMenu() {
    await this.menuController.open('filter-menu');
  }

  get labelGroups(): LabelGroup[] {
    return this._labelGroups;
  }

  public labelsForGroup(groupId: string): Label[] {
    return getLabelsForGroup(this._labels, groupId);
  }

  public labelsForRecipe(recipeId: string): Label[] {
    return getLabelsForRecipe(this._labels, recipeId);
  }

  get recipes(): Recipe[] {
    return this.results;
  }

  get hasRecipes(): boolean {
    return this._recipes.length > 0;
  }
}
