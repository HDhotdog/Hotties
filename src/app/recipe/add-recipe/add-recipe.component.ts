import {CommonModule, Location} from '@angular/common';
import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, RouterModule} from '@angular/router';
import {FormsModule} from '@angular/forms';
import {IonicModule} from '@ionic/angular';
import {RxIngredient} from '../../ingredients/ingredient';
import {RxLabel} from '../../label/models/label';
import {RxRecipe} from '../models/recipe';
import {RecipeService} from '../recipe.service';
import {v4 as uuidv4} from 'uuid';
import {LabelService} from "../../label/label-service.service";
import {NgxImageCompressService} from 'ngx-image-compress';
import {EmojiModule} from '@ctrl/ngx-emoji-mart/ngx-emoji';
import {PickerModule} from '@ctrl/ngx-emoji-mart';
import {forkJoin} from 'rxjs';

@Component({
  selector: 'app-add-recipe',
  templateUrl: './add-recipe.component.html',
  styleUrls: ['./add-recipe.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, RouterModule, EmojiModule, PickerModule]
})
export class AddRecipeComponent implements OnInit {

  private _name: string = "";
  private _description: string = "";
  private _hours: number = 0;
  private _minutes: number = 0;
  private _prepTime: number = 0;
  private _ingredient: string = "";
  private _ingredients: RxIngredient[] = [];
  private _recipe: RxRecipe = {} as RxRecipe;
  private _stringLabels: string[] = [];
  private _availableLabelNames: string[] = [];
  private _labels: RxLabel[] = [];
  private _imgSrc: string = "";
  private _imageSelected: boolean = false;
  private _showEmojiPicker: boolean = false;
  private _selectedEmoji: string | null = null;
  private _newLabel: string = "";

  constructor(private location: Location,
              private recipeService: RecipeService,
              private route: ActivatedRoute,
              private labelService: LabelService,
              private imageCompress: NgxImageCompressService) {
  }

  ngOnInit(): void {
    const index = this.route.snapshot.paramMap.get('id');
    if (index) {
      const recipe = this.recipeService.findById(index);
      const ingredients = this.recipeService.getIngredients(index);
      const labels = this.labelService.getDistinctLabelNames();
      forkJoin([recipe, ingredients, labels]).subscribe(([recipe, ingredients, labels]) => {
        this._availableLabelNames = labels;
        this._recipe = recipe;
        this._name = recipe.name;
        // this._imgSrc = recipe.imgSrc;
        this._description = recipe.description;
        this._prepTime = recipe.preparationTime;
        this._ingredients = ingredients;
        // this._minutes = recipe.prepTimeMinutes;
        // this._ingredients = recipe.ingredients;
        // this._stringLabels = recipe.labels.map((label: RxLabel) => label.name);
        // this._imageSelected = !!this._imgSrc;
        // this._labels = recipe.labels;
        // this._selectedEmoji = recipe.emoji || null;
      });
    } else {
      this.labelService.getDistinctLabelNames().subscribe(labels => {
        this._availableLabelNames = labels
        this._recipe = {
          id: uuidv4(),
          name: this._name,
          // imgSrc: this._imgSrc,
          description: this._description,
          preparationTime: this._prepTime,
          // prepTimeHour: this._hours,
          // prepTimeMinutes: this._minutes,
          // ingredients: this._ingredients,
          // labels: this._labels,
          // emoji: this._selectedEmoji
        };
      });
    }
  }

  public navigateBack() {
    this.location.back();
  }

  public saveRecipe() {
    let recipe: RxRecipe;
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      recipe = this._recipe;
      recipe.id = id;
      recipe.name = this._name;
      recipe.description = this._description;
      recipe.preparationTime = this._prepTime;
      // recipe.imgSrc = this._imgSrc;
      // recipe.prepTimeHour = this._hours;
      // recipe.prepTimeMinutes = this._minutes;
      // recipe.ingredients = this._ingredients;
      // recipe.labels = this._labels;
      // recipe.emoji = this._selectedEmoji;
    } else {
      recipe = {
        id: uuidv4(),
        name: this._name,
        // imgSrc: this._imgSrc,
        description: this._description,
        preparationTime: this._prepTime,
        // prepTimeHour: this._hours,
        // prepTimeMinutes: this._minutes,
        // ingredients: this._ingredients,
        // labels: this._labels,
        // emoji: this._selectedEmoji
      }
    }
    // const recipe = this.recipeService.save(recipe);
    this.recipeService.save(recipe).subscribe(() => {
      console.log("Saved Recipe");
      this.navigateBack();
    });
  }

  public inputChanged(): boolean {
    return this._recipe.name !== this._name
      || this._recipe.description !== this._description
      || this._recipe.preparationTime !== this._prepTime
    // || this._recipe.prepTimeHour !== this._hours
    // || this._recipe.prepTimeMinutes !== this._minutes
    // || this._recipe.ingredients !== this._ingredients
    // || this._recipe.labels !== this._labels
    // || this._recipe.imgSrc !== this._imgSrc
    // || this._recipe.emoji !== this._selectedEmoji;
  }

  public addIngredient(): void {
    this._ingredients.push({
      id: uuidv4(),
      recipeId: this._recipe.id,
      name: this._ingredient,
    })
    this._ingredient = "";
  }

  public removeIngredient(ingredient: RxIngredient) {
    const index = this._ingredients.indexOf(ingredient)
    this._ingredients.splice(index, 1)
  }

  public handleLabelChange() {
    this._labels = this._stringLabels.map((label) => {
      return {
        name: label
      } as RxLabel
    })
  }

  public uploadFile() {
    this.uploadCompressedFile();
  }

  public deleteImage() {
    this._imgSrc = "";
    this._imageSelected = false;
  }

  private uploadCompressedFile() {
    const MAX_MEGABYTE = 2;
    this.imageCompress
      .uploadAndGetImageWithMaxSize(MAX_MEGABYTE)
      .then(
        (result: string) => {
          this._imgSrc = result;
        },
        (result: string) => {
          this._imgSrc = result;
        }
      );
  }

  public toggleEmojiPicker() {
    this._showEmojiPicker = !this._showEmojiPicker;
  }

  public addEmoji(event: any) {
    this._selectedEmoji = event.emoji.native;
    this._showEmojiPicker = false;
  }

  get recipe(): RxRecipe {
    return this._recipe;
  }

  get name(): string {
    return this._name;
  }

  set name(name: string) {
    this._name = name;
  }

  get ingredients(): RxIngredient[] {
    return this._ingredients;
  }

  set ingredients(ingredients: RxIngredient[]) {
    this._ingredients = ingredients;
  }

  get imgSrc(): string {
    return this._imgSrc;
  }

  get description(): string {
    return this._description;
  }

  set description(description: string) {
    this._description = description;
  }

  get hours(): number {
    return this._hours;
  }

  set hours(hours: number) {
    this._hours = hours;
  }

  get minutes(): number {
    return this._minutes;
  }

  set minutes(minutes: number) {
    this._minutes = minutes;
  }

  get selectedEmoji(): string | null {
    return this._selectedEmoji;
  }

  get stringLabels(): string[] {
    return this._stringLabels;
  }

  set stringLabels(stringLabels: string[]) {
    this._stringLabels = stringLabels;
  }

  get availableLabels(): string[] {
    return this._availableLabelNames;
  }

  get labels(): RxLabel[] {
    return this._labels;
  }

  set labels(labels: RxLabel[]) {
    this._labels = labels;
  }

  get showEmojiPicker(): boolean {
    return this._showEmojiPicker;
  }

  get imageSelected(): boolean {
    return this._imageSelected;
  }

  get ingredient(): string {
    return this._ingredient;
  }

  set ingredient(ingredient: string) {
    this._ingredient = ingredient;
  }

  get newLabel(): string {
    return this._newLabel;
  }

  set newLabel(newLabel: string) {
    this._newLabel = newLabel;
  }
}
