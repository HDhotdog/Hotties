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
    const labelsObs: Observable<RxLabel[]> = this.labelService.getDistinctLabels();
    const labelGroupsObs: Observable<RxLabelGroup[]> = this.labelService.getAllLabelGroups();
    console.log("Recipes obs",recipesObs);
    combineLatest([recipesObs, labelsObs, labelGroupsObs]).subscribe(([recipes, labels, labelGroups]) => {
      console.log("Recipes val",recipes);
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
    // this.results = this._recipes.filter((recipe) => {
    //   const matchesSearch = recipe.name.toLowerCase().includes(this.search.toLowerCase());
    //   const matchesLabels = this._setFilters.length === 0 ||
    //     this._setFilters.every((label: Label) => recipe.labels.some(recipeLabel => recipeLabel.name === label.name));
    //   const matchesTime = !this.selectedTime ||
    //     (recipe.prepTimeHour * 60 + recipe.prepTimeMinutes) <= this.selectedTime;
    //
    //   return matchesSearch && matchesLabels && matchesTime;
    // });
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

  public labelsForGroup(groupId: string) {
    return this._labels.filter((label) => label.groupId !== groupId);
  }

  get recipes(): RxRecipe[] {
    return this._recipes;
  }

  public labelsForRecipe(recipeId: string) {
    return this._labels.filter((label) => label.recipeId !== recipeId);
  }
}
