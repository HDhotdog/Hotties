import {Component, OnInit} from '@angular/core';
import {RecipeService} from './recipe.service';
import {RxRecipe} from './models/recipe';
import {RxLabel, RxLabelGroup} from '../label/models/label';
import {ActivatedRoute, Router, RouterModule} from '@angular/router';
import {LabelService} from "../label/label-service.service";
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {IonicModule, MenuController} from '@ionic/angular';
import {combineLatest, Observable} from 'rxjs';
import {filterRecipes, labelsForGroup as getLabelsForGroup, labelsForRecipe as getLabelsForRecipe} from './recipe-filter';

@Component({
  selector: 'app-recipe',
  templateUrl: 'recipe.component.html',
  styleUrls: ['recipe.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, RouterModule]
})
export class RecipeComponent implements OnInit {
  private _recipes: RxRecipe[] = [];
  private _labels: RxLabel[] = [];
  private _labelGroups: RxLabelGroup[] = [];

  private _setFilters: RxLabel[] = [];
  public search: string = "";
  public selectedTime: number | null = null;
  public results: RxRecipe[] = [];

  constructor(private recipeService: RecipeService, private router: Router, private route: ActivatedRoute,
              public labelService: LabelService, private menuController: MenuController) {
  }

  ngOnInit(): void {
    const recipesObs: Observable<RxRecipe[]> = this.recipeService.findAll();
    const labelsObs: Observable<RxLabel[]> = this.labelService.getAllLabels();
    const labelGroupsObs: Observable<RxLabelGroup[]> = this.labelService.getAllLabelGroups();
    combineLatest([recipesObs, labelsObs, labelGroupsObs]).subscribe(([recipes, labels, labelGroups]) => {
      this._recipes = recipes;
      this._labels = labels;
      this._labelGroups = labelGroups;
      this.filterRecipes();
    });
  }

   ionViewWillEnter(): void {
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

  public changeFilter(event: Event, label: RxLabel) {
    if((event.target as HTMLIonCheckboxElement).checked) {
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

  public openRecipe(recipe: RxRecipe): void {
    this.router.navigate(['display', recipe.id], {relativeTo: this.route})
  }

  public newRecipe() {
    this.router.navigate(['new'], {relativeTo: this.route})
  }

  async openFilterMenu() {
    await this.menuController.open('filter-menu');
  }

  get labelGroups(): RxLabelGroup[] {
    return this._labelGroups;
  }

  public labelsForGroup(groupId: string): RxLabel[] {
    return getLabelsForGroup(this._labels, groupId);
  }

  public labelsForRecipe(recipeId: string): RxLabel[] {
    return getLabelsForRecipe(this._labels, recipeId);
  }

  get recipes(): RxRecipe[] {
    return this.results;
  }

}
