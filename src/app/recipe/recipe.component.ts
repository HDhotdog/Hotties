import {Component, OnInit} from '@angular/core';
import {RecipeService} from './recipe.service';
import {Recipe} from './models/recipe.interface';
import {Label} from '../label/models/label.interface';
import {ActivatedRoute, Router, RouterModule} from '@angular/router';
import {LabelService} from "../settings/label-setting/label-service.service";
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {IonicModule} from '@ionic/angular';

@Component({
  selector: 'app-recipe',
  templateUrl: 'recipe.component.html',
  styleUrls: ['recipe.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, RouterModule]
})
export class RecipeComponent implements OnInit {

  private _recipes: Recipe[] = [];
  private _resultSet: Recipe[] = [];
  private _labels: Label[] = [];
  private _setFilters: Label[] = [];
  public search: string = "";

  constructor(private recipeService: RecipeService, private router: Router, private route: ActivatedRoute,
              public labelService: LabelService) {
  }

  ngOnInit(): void {
    this.recipeService.loadRecipes().then(() => {
      this._recipes = this.recipeService.recipes;
      this._resultSet = this._recipes;
    })
    this.labelService.loadLabels().then(() => {
      const labels = this.labelService.labelGroups.map((labelGroup) => labelGroup.labels);
      this._labels = labels.reduce((acc, val) => acc.concat(val), []);
    })
  }

  async ionViewWillEnter() {
    await this.recipeService.loadRecipes().then(() => {
      this._recipes = this.recipeService.recipes;
      this._resultSet = this._recipes;
    });
  }

  public parseDate(recipe: Recipe): string {
    let date: string = "";
    if (recipe.prepTimeHour > 0) {
      date += recipe.prepTimeHour + "h "
    }
    if (recipe.prepTimeMinutes > 0) {
      date += recipe.prepTimeMinutes + "m"
    }
    return date.trim();
  }

  public changeFilter(event: Event, label: Label) {
    if((event.target as HTMLIonCheckboxElement).checked) {
      this._setFilters.push(label);
    } else {
      this._setFilters.splice(this._setFilters.indexOf(label), 1);
    }
    this._resultSet = this._recipes.filter((recipe) =>
      this._setFilters.every(filter => recipe.labels.map(label => label.name).includes(filter.name))
    );
  }

  get results(): Recipe[] {
    return this._resultSet.filter((recipe) => recipe.name.toLowerCase().includes(this.search.toLowerCase()));
  }

  get labels(): Label[] {
    return this._labels;
  }

  public openRecipe(recipe: Recipe): void {
    this.router.navigate(['display', recipe.uuid], {relativeTo: this.route})
  }

  public newRecipe() {
    this.router.navigate(['new'], {relativeTo: this.route})
  }
}
