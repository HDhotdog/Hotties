import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { RecipeService } from './recipe.service';
import { Recipe } from './models/recipe.dto';
import { Label, LabelGroup } from '../label/models/label.dto';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LabelService } from '../label/label-service.service';

import { FormsModule } from '@angular/forms';
import { IonicModule, MenuController } from '@ionic/angular';
import { combineLatest, forkJoin, map, Observable } from 'rxjs';
import {
  filterRecipes,
  labelsForGroup as getLabelsForGroup,
  labelsForRecipe as getLabelsForRecipe,
} from './recipe-filter';

@Component({
  selector: 'app-recipe',
  templateUrl: 'recipe.component.html',
  styleUrls: ['recipe.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [IonicModule, FormsModule, RouterModule],
})
export class RecipeComponent implements OnInit, OnDestroy {
  private recipeService = inject(RecipeService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  labelService = inject(LabelService);
  private menuController = inject(MenuController);

  private _recipes: Recipe[] = [];
  private _labels: Label[] = [];
  private _labelGroups: LabelGroup[] = [];

  private _setFilters: Label[] = [];
  public search: string = '';
  public selectedTime: number | null = null;
  public results: Recipe[] = [];

  private imageUrls = new Map<string, string>();

  ngOnInit(): void {
    const recipesObs: Observable<Recipe[]> = this.recipeService.findAll();
    const labelsObs: Observable<Label[]> = this.labelService.getAllLabels();
    const labelGroupsObs: Observable<LabelGroup[]> =
      this.labelService.getAllLabelGroups();
    combineLatest([recipesObs, labelsObs, labelGroupsObs]).subscribe(
      ([recipes, labels, labelGroups]) => {
        this._recipes = recipes;
        this._labels = labels;
        this._labelGroups = labelGroups;
        this.filterRecipes();
        this.loadImages(recipes);
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
      return;
    }

    forkJoin(
      recipes.map((recipe) =>
        this.recipeService
          .getImageUrl(recipe.id)
          .pipe(map((url) => ({ id: recipe.id, url })))
      )
    ).subscribe((results) => {
      this.revokeImageUrls();
      const newImageUrls = new Map<string, string>();
      results.forEach(({ id, url }) => {
        if (url) {
          newImageUrls.set(id, url);
        }
      });
      this.imageUrls = newImageUrls;
    });
  }

  private revokeImageUrls(): void {
    this.imageUrls.forEach((url) => URL.revokeObjectURL(url));
  }

  public imageUrlFor(recipeId: string): string | undefined {
    return this.imageUrls.get(recipeId);
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
    this.router.navigate(['display', recipe.id], { relativeTo: this.route });
  }

  public newRecipe() {
    this.router.navigate(['new'], { relativeTo: this.route });
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
}
