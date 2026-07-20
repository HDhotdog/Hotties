import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Ingredient } from '../../ingredients/ingredient.dto';
import { Label } from '../../label/models/label.dto';
import { Recipe } from '../models/recipe.dto';
import { RecipeService } from '../recipe.service';
import { v4 as uuidv4 } from 'uuid';
import { LabelService } from '../../label/label-service.service';
import { NgxImageCompressService } from 'ngx-image-compress';
import { EmojiModule } from '@ctrl/ngx-emoji-mart/ngx-emoji';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { combineLatest, forkJoin, of } from 'rxjs';
import { dataUrlToBlob } from '../../database/attachment-utils';

@Component({
  selector: 'app-add-recipe',
  templateUrl: './add-recipe.component.html',
  styleUrls: ['./add-recipe.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    RouterModule,
    EmojiModule,
    PickerModule,
  ],
})
export class AddRecipeComponent implements OnInit {
  private router = inject(Router);
  private recipeService = inject(RecipeService);
  private route = inject(ActivatedRoute);
  private labelService = inject(LabelService);
  private imageCompress = inject(NgxImageCompressService);

  private _name: string = '';
  private _description: string = '';
  private _hours: number = 0;
  private _minutes: number = 0;
  private _prepTime: number = 0;
  private _ingredient: string = '';
  private _ingredients: Ingredient[] = [];
  private _recipe: Recipe = {} as Recipe;
  private _stringLabels: string[] = [];
  private _templateLabels: Label[] = [];
  private _labels: Label[] = [];
  private _imagePreviewUrl: string = '';
  private _pendingImageBlob: Blob | null = null;
  private _imageRemoved: boolean = false;
  private _imageSelected: boolean = false;
  private _showEmojiPicker: boolean = false;
  private _selectedEmoji: string | null = null;
  private _newLabel: string = '';

  ngOnInit(): void {
    const index = this.route.snapshot.paramMap.get('id');
    if (index) {
      const recipe = this.recipeService.findById(index);
      const ingredients = this.recipeService.getIngredients(index);
      const templateLabels = this.labelService.getTemplateLabels();
      const recipeLabels = this.labelService.getLabelsForRecipe(index);
      // combineLatest (not forkJoin): findById()/getIngredients()/getTemplateLabels()/getLabelsForRecipe()
      // are live queries (RxDB `.$`) that never complete, so forkJoin would never emit.
      combineLatest([
        recipe,
        ingredients,
        templateLabels,
        recipeLabels,
      ]).subscribe(([recipe, ingredients, templateLabels, recipeLabels]) => {
        this._templateLabels = templateLabels;
        this._recipe = recipe;
        this._name = recipe.name;
        this._description = recipe.description;
        this._prepTime = recipe.preparationTime;
        this._hours = Math.floor(recipe.preparationTime / 60);
        this._minutes = recipe.preparationTime % 60;
        this._ingredients = ingredients;
        this._labels = recipeLabels;
        this._stringLabels = templateLabels
          .filter((template) =>
            recipeLabels.some(
              (label) =>
                label.name === template.name &&
                label.groupId === template.groupId
            )
          )
          .map((template) => template.id);
        this._selectedEmoji = recipe.emoji ?? null;
      });
      this.recipeService.getImageUrl(index).subscribe((url) => {
        this._imagePreviewUrl = url ?? '';
        this._imageSelected = !!url;
      });
    } else {
      this.labelService.getTemplateLabels().subscribe((templateLabels) => {
        this._templateLabels = templateLabels;
        this._recipe = {
          id: uuidv4(),
          name: this._name,
          description: this._description,
          preparationTime: this._prepTime,
          emoji: this._selectedEmoji,
        };
      });
    }
  }

  public navigateBack() {
    // Explicit destination rather than Location.back(): back() depends on
    // browser history, which is empty/unrelated on a fresh navigation or
    // deep link (e.g. after saving), so it could land anywhere.
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      void this.router.navigate(['/tabs/recipe/display', id]);
    } else {
      void this.router.navigate(['/tabs/recipe']);
    }
  }

  public saveRecipe() {
    let recipe: Recipe;
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      recipe = this._recipe;
      recipe.id = id;
      recipe.name = this._name;
      recipe.description = this._description;
      recipe.preparationTime = this._prepTime;
      // recipe.ingredients = this._ingredients;
      // recipe.labels = this._labels;
      recipe.emoji = this._selectedEmoji;
    } else {
      recipe = {
        id: this._recipe.id,
        name: this._name,
        description: this._description,
        preparationTime: this._prepTime,
        // ingredients: this._ingredients,
        // labels: this._labels,
        emoji: this._selectedEmoji,
      };
    }
    const savedRecipe = this.recipeService.save(recipe);
    const savedLabels = this.labelService.saveLabelsForRecipe(
      recipe.id,
      this._labels
    );
    const savedIngredients = this.recipeService.saveIngredients(
      recipe.id,
      this._ingredients
    );

    forkJoin([savedRecipe, savedLabels, savedIngredients]).subscribe(() => {
      const imageOp = this._pendingImageBlob
        ? this.recipeService.saveImage(recipe.id, this._pendingImageBlob)
        : this._imageRemoved
          ? this.recipeService.deleteImage(recipe.id)
          : of(void 0);

      imageOp.subscribe(() => this.navigateBack());
    });
  }

  public inputChanged(): boolean {
    return (
      this._recipe.name !== this._name ||
      this._recipe.description !== this._description ||
      this._recipe.preparationTime !== this._prepTime ||
      this._pendingImageBlob !== null ||
      this._imageRemoved ||
      (this._recipe.emoji ?? null) !== this._selectedEmoji
    );
    // || this._recipe.ingredients !== this._ingredients
    // || this._recipe.labels !== this._labels
  }

  public addIngredient(): void {
    this._ingredients.push({
      id: uuidv4(),
      recipeId: this._recipe.id,
      name: this._ingredient,
    });
    this._ingredient = '';
  }

  public removeIngredient(ingredient: Ingredient) {
    const index = this._ingredients.indexOf(ingredient);
    this._ingredients.splice(index, 1);
  }

  public handleLabelChange(): void {
    this._labels = this._stringLabels
      .map((templateId) =>
        this._templateLabels.find((template) => template.id === templateId)
      )
      .filter((template): template is Label => !!template)
      .map((template) => ({
        id: uuidv4(),
        recipeId: this._recipe.id,
        groupId: template.groupId,
        name: template.name,
      }));
  }

  public uploadFile() {
    this.uploadCompressedFile();
  }

  public deleteImage() {
    this._imagePreviewUrl = '';
    this._pendingImageBlob = null;
    this._imageRemoved = true;
    this._imageSelected = false;
  }

  private uploadCompressedFile() {
    const MAX_MEGABYTE = 2;
    this.imageCompress.uploadAndGetImageWithMaxSize(MAX_MEGABYTE).then(
      (result: string) => {
        this._imagePreviewUrl = result;
        this._pendingImageBlob = dataUrlToBlob(result);
        this._imageRemoved = false;
        this._imageSelected = true;
      },
      (result: string) => {
        this._imagePreviewUrl = result;
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

  get recipe(): Recipe {
    return this._recipe;
  }

  get name(): string {
    return this._name;
  }

  set name(name: string) {
    this._name = name;
  }

  get ingredients(): Ingredient[] {
    return this._ingredients;
  }

  set ingredients(ingredients: Ingredient[]) {
    this._ingredients = ingredients;
  }

  get imagePreviewUrl(): string {
    return this._imagePreviewUrl;
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
    this._prepTime = this._hours * 60 + this._minutes;
  }

  get minutes(): number {
    return this._minutes;
  }

  set minutes(minutes: number) {
    this._minutes = minutes;
    this._prepTime = this._hours * 60 + this._minutes;
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

  get availableLabels(): Label[] {
    return this._templateLabels;
  }

  get labels(): Label[] {
    return this._labels;
  }

  set labels(labels: Label[]) {
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
