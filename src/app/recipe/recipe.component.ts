import {Component, OnInit} from '@angular/core';
import {RecipeService} from './recipe.service';
import {Recipe} from './models/recipe.interface';
import {Label, LabelGroup} from '../label/models/label.interface';
import {ActivatedRoute, Router, RouterModule} from '@angular/router';
import {LabelService} from "../settings/label-setting/label-service.service";
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {IonicModule} from '@ionic/angular';
import {MenuController} from '@ionic/angular';
import { forkJoin } from 'rxjs';
@Component({
  selector: 'app-recipe',
  templateUrl: 'recipe.component.html',
  styleUrls: ['recipe.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, RouterModule]
})
export class RecipeComponent implements OnInit {

  private _recipes: Recipe[] = [];
  private _setFilters: Label[] = [];
  public search: string = "";
  public selectedTime: number | null = null;
  public results: Recipe[] = [];
  private _labelGroups: LabelGroup[] = [];
  constructor(private recipeService: RecipeService, private router: Router, private route: ActivatedRoute,
              public labelService: LabelService, private menuController: MenuController) {
  }

  ngOnInit(): void {
    const recipes = this.recipeService.findAll();
    const labels = this.labelService.loadLabels();
    forkJoin([recipes, labels]).subscribe(([recipes, labels]) => {
      this._recipes = recipes;
      this._labelGroups = labels;
      this.filterRecipes();
    });
  }

   ionViewWillEnter(): void {
    this.ngOnInit();
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
    this.filterRecipes();
  }

  public filterRecipes(): void {
    this.results = this._recipes.filter((recipe) => {
      const matchesSearch = recipe.name.toLowerCase().includes(this.search.toLowerCase());
      const matchesLabels = this._setFilters.length === 0 || 
        this._setFilters.every((label: Label) => recipe.labels.some(recipeLabel => recipeLabel.name === label.name));
      const matchesTime = !this.selectedTime || 
        (recipe.prepTimeHour * 60 + recipe.prepTimeMinutes) <= this.selectedTime;
      
      return matchesSearch && matchesLabels && matchesTime;
    });
  }

  public openRecipe(recipe: Recipe): void {
    this.router.navigate(['display', recipe.id], {relativeTo: this.route})
  }

  public newRecipe() {
    this.router.navigate(['new'], {relativeTo: this.route})
  }

  async openFilterMenu() {
    await this.menuController.open('filter-menu');
  }

  get labelGroups(): LabelGroup[] {
    return this._labelGroups;
  }
}
