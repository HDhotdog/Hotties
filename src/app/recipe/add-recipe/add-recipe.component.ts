import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { Ingredient, Label, Recipe } from '../recipe';
import { RecipeService } from '../recipe.service';
import { v4 as uuidv4 } from 'uuid';

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
  public availableLabels = ["Frühstück", "Mittagessen", "Abendessen", "Snack", "Süß", "Scharf"];
  private labels: Label[] = [];

  constructor(private location: Location,
    private recipeService: RecipeService,
    private toastCtrl: ToastController,
    private route: ActivatedRoute) { }

  ngOnInit(): void {
    const index = this.route.snapshot.paramMap.get('id');
    if (index) {
      const i = parseInt(index);
      this.previousInputs = this.recipeService.recipes[i];
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
    if (this.recipeService.recipes.filter(recipe => recipe.name == this.name).length > 0) {
      let toast = this.toastCtrl.create({
        message: "There already exists a category with this name",
        duration: 2000,
        position: "bottom",
        color: "danger"
      });
      toast.then(toast => {
        toast.present();
      })
    } else {
      const index = this.route.snapshot.paramMap.get('id');
      if (index) {
        this.recipeService.recipes[parseInt(index)].name = this.name;
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
      this.recipeService.saveRecipes();
      this.navigateBack();
    }
  }

  public inputChanged(): boolean {
    return this.previousInputs.name !== this.name
    || this.previousInputs.description !== this.description
    || this.previousInputs.prepTimeHour !== this.hours
    || this.previousInputs.prepTimeMinutes !== this.minutes
    || this.previousInputs.ingredients !== this.ingridients
    || this.previousInputs.labels !==  this.labels;
  }

  public editingCategory(): boolean {
    return this.route.snapshot.paramMap.get("id") != null;
  }

  public addIngridient(): void {
    this.ingridients.push({
      name: this.ingridient,
      shouldBuy: true
    })
    this.ingridient = "";
  }

  public removeIngridient(ingridient: Ingredient) {
    const index = this.ingridients.indexOf(ingridient)
    this.ingridients.splice(index, 1)
  }

  public handleLabelChange() {
    this.labels = this.stringLabels.map((label) => {
      return {
        name: label
      } as Label
    })
  }
}
