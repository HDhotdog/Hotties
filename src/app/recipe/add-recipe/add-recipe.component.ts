import {Location} from '@angular/common';
import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {Ingredient, Label, Recipe} from '../recipe';
import {RecipeService} from '../recipe.service';
import {v4 as uuidv4} from 'uuid';
import {LabelService} from "../../settings/label-setting/label-service.service";

@Component({
  selector: 'app-add-category',
  templateUrl: './add-recipe.component.html',
  styleUrls: ['./add-recipe.component.scss'],
})
export class AddRecipeComponent implements OnInit {

  public name: string = "";
  public description: string = "";
  public hours: number = 0;
  public minutes: number = 0;
  public ingridient: string = "";
  public ingridients: Ingredient[] = [];
  public previousInputs: Recipe = {} as Recipe;
  public stringLabels: string[] = [];
  public availableLabels: Label[] = [];
  private labels: Label[] = [];

  constructor(private location: Location,
              private recipeService: RecipeService,
              private route: ActivatedRoute,
              private labelService: LabelService) {
  }

  ngOnInit(): void {
    this.labelService.loadLabels().then(() => {
        this.setAllLabels();
      }
    )
    const index = this.route.snapshot.paramMap.get('id');
    if (index) {

      this.previousInputs = this.recipeService.recipes.find((recipe) => recipe.uuid === index)!;
      this.name = this.previousInputs.name;
      this.description = this.previousInputs.description;
      this.hours = this.previousInputs.prepTimeHour;
      this.minutes = this.previousInputs.prepTimeMinutes;
      this.ingridients = this.previousInputs.ingredients;
      this.stringLabels = this.previousInputs.labels.map(label => label.name);
    } else {
      this.previousInputs = {
        uuid: uuidv4(),
        name: this.name,
        description: this.description,
        prepTimeHour: this.hours,
        prepTimeMinutes: this.minutes,
        ingredients: this.ingridients,
        labels: this.labels
      } as Recipe;
    }
  }

  public navigateBack() {
    this.location.back();
  }

  public saveCategory() {
    const index = this.route.snapshot.paramMap.get('id');
    if (index) {
      const i = this.recipeService.recipes.findIndex((recipe) => recipe.uuid === index);
      this.recipeService.recipes[i].name = this.name;
      this.recipeService.recipes[i].description = this.description;
      this.recipeService.recipes[i].prepTimeHour = this.hours;
      this.recipeService.recipes[i].prepTimeMinutes = this.minutes;
      this.recipeService.recipes[i].ingredients = this.ingridients;
      this.recipeService.recipes[i].labels = this.labels;
    } else {
      const recipe: Recipe = {
        uuid: uuidv4(),
        name: this.name,
        description: this.description,
        prepTimeHour: this.hours,
        prepTimeMinutes: this.minutes,
        ingredients: this.ingridients,
        labels: this.labels,
      }
      this.recipeService.recipes.push(recipe);
      this.recipeService.saveRecipes();
    }
    this.recipeService.saveRecipes().then(() => {
      this.navigateBack();
    });
  }

  public inputChanged(): boolean {
    return this.previousInputs.name !== this.name
      || this.previousInputs.description !== this.description
      || this.previousInputs.prepTimeHour !== this.hours
      || this.previousInputs.prepTimeMinutes !== this.minutes
      || this.previousInputs.ingredients !== this.ingridients
      || this.previousInputs.labels !== this.labels;
  }

  public addIngredient(): void {
    this.ingridients.push({
      name: this.ingridient,
      shouldBuy: true
    })
    this.ingridient = "";
  }

  public removeIngredient(ingredient: Ingredient) {
    const index = this.ingridients.indexOf(ingredient)
    this.ingridients.splice(index, 1)
  }

  public handleLabelChange() {
    this.labels = this.stringLabels.map((label) => {
      return {
        name: label
      } as Label
    })
  }

  private setAllLabels() {
    this.labelService.labelGroups.map((labelGroup) => {
      labelGroup.labels.map((label) => {
        this.availableLabels.push(label);
      })
    })
  }
}
