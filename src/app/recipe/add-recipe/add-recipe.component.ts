import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Ingredient } from '../models/ingredient.interface';
import { Label } from '../../label/models/label.interface';
import { Recipe } from '../models/recipe.interface';
import { RecipeService } from '../recipe.service';
import { v4 as uuidv4 } from 'uuid';
import { LabelService } from "../../settings/label-setting/label-service.service";
import { NgxImageCompressService } from 'ngx-image-compress';

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
  public ingredient: string = "";
  public ingredients: Ingredient[] = [];
  public previousInputs: Recipe = {} as Recipe;
  public stringLabels: string[] = [];
  public availableLabels: Label[] = [];
  private labels: Label[] = [];
  public imgSrc: string = "";
  public imageSelected: boolean = false;

  constructor(private location: Location,
    private recipeService: RecipeService,
    private route: ActivatedRoute,
    private labelService: LabelService,
    private imageCompress: NgxImageCompressService) {
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
      this.imgSrc = this.previousInputs.imgSrc;
      this.description = this.previousInputs.description;
      this.hours = this.previousInputs.prepTimeHour;
      this.minutes = this.previousInputs.prepTimeMinutes;
      this.ingredients = this.previousInputs.ingredients;
      this.stringLabels = this.previousInputs.labels.map(label => label.name);
      this.imageSelected = !!this.imgSrc;
      this.labels = this.previousInputs.labels;
    } else {
      this.previousInputs = {
        uuid: uuidv4(),
        name: this.name,
        imgSrc: this.imgSrc,
        description: this.description,
        prepTimeHour: this.hours,
        prepTimeMinutes: this.minutes,
        ingredients: this.ingredients,
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
      this.recipeService.recipes[i].imgSrc = this.imgSrc;
      this.recipeService.recipes[i].prepTimeHour = this.hours;
      this.recipeService.recipes[i].prepTimeMinutes = this.minutes;
      this.recipeService.recipes[i].ingredients = this.ingredients;
      this.recipeService.recipes[i].labels = this.labels;
    } else {
      const recipe: Recipe = {
        uuid: uuidv4(),
        name: this.name,
        imgSrc: this.imgSrc,
        description: this.description,
        prepTimeHour: this.hours,
        prepTimeMinutes: this.minutes,
        ingredients: this.ingredients,
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
      || this.previousInputs.ingredients !== this.ingredients
      || this.previousInputs.labels !== this.labels
      || this.previousInputs.imgSrc !== this.imgSrc;
  }

  public addIngredient(): void {
    this.ingredients.push({
      name: this.ingredient,
      shouldBuy: true
    })
    this.ingredient = "";
  }

  public removeIngredient(ingredient: Ingredient) {
    const index = this.ingredients.indexOf(ingredient)
    this.ingredients.splice(index, 1)
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

  public uploadFile() {
    this.uploadCompressedFile();
  }

  public deleteImage() {
    this.imgSrc = "";
    this.imageSelected = false;
  }

  private uploadCompressedFile() {
    const MAX_MEGABYTE = 2;
    this.imageCompress
        .uploadAndGetImageWithMaxSize(MAX_MEGABYTE)
        .then(
            (result: string) => {
                this.imgSrc = result;
            },
            (result: string) => {
                this.imgSrc = result;
            }
        );
}
}
