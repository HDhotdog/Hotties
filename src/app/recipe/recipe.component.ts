import {Component, OnInit} from '@angular/core';
import {RecipeService} from './recipe.service';
import {Label, Recipe} from './recipe';
import {ActivatedRoute, Router} from '@angular/router';
import {LabelService} from "../settings/label-setting/label-service.service";

@Component({
  selector: 'app-recipe',
  templateUrl: 'recipe.component.html',
  styleUrls: ['recipe.component.scss']
})
export class RecipeComponent implements OnInit {

  private _recipes: Recipe[] = [];
  private _labels: Label[] = [];
  public search: string = "";

  constructor(private recipeService: RecipeService, private router: Router, private route: ActivatedRoute,
              public labelService: LabelService) {
  }

  ngOnInit(): void {
    this.recipeService.loadRecipes().then(() => {
      this._recipes = this.recipeService.recipes;
    })
    this.labelService.loadLabels().then(() => {
      const labels = this.labelService.labelGroups.map((labelGroup) => labelGroup.labels);
      this._labels = labels.reduce((acc, val) => acc.concat(val), []);
    })
  }

  async ionViewWillEnter() {
    this.recipeService.loadRecipes();
    this._recipes = this.recipeService.recipes;
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

  get results(): Recipe[] {
    return this._recipes.filter((recipe) => recipe.name.toLowerCase().includes(this.search.toLowerCase()));
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
