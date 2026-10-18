import {LocalizedNumberDirective} from '../../i18n/localized-number.directive';
import {LocalizationService} from '../../i18n/localization.service';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonImg,
  IonInput,
  IonLabel,
  IonModal,
  IonPicker,
  IonPickerColumn,
  IonPickerColumnOption,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import {CommonModule} from '@angular/common';
import {ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnDestroy, OnInit,} from '@angular/core';
import {ActivatedRoute, Router, RouterModule} from '@angular/router';
import {FormsModule} from '@angular/forms';
import {Ingredient} from '../../ingredients/ingredient.dto';
import {Label} from '../../label/models/label.dto';
import {Recipe} from '../models/recipe.dto';
import {copyRecipeSteps, RecipeStep} from '../models/recipe-step';
import {RecipeService} from '../recipe.service';
import {v4 as uuidv4} from 'uuid';
import {LabelService} from '../../label/label-service.service';
import {NgxImageCompressService} from 'ngx-image-compress';
import {combineLatest, firstValueFrom, forkJoin, of} from 'rxjs';
import {take} from 'rxjs/operators';
import {cropImageToSquare, dataUrlToBlob} from '../../database/attachment-utils';
import {CatalogNode} from '../../domain/catalog.model';
import {CatalogService} from '../../domain/catalog.service';
import {QuantityUnit} from '../../domain/quantity';

const AUTO_SAVE_DELAY_MS = 500;
const SAVE_PULSE_DURATION_MS = 300;
const HOURS_MAX = 23;
const RECIPE_IMAGE_MAX_SIZE = 300;
const MAX_ITEM_SUGGESTIONS = 8;

export type IngredientModalMode = 'existing' | 'new';

export type SaveStatus = 'saved' | 'unsaved';

@Component({
  selector: 'app-add-recipe',
  templateUrl: './add-recipe.component.html',
  styleUrls: ['./add-recipe.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LocalizedNumberDirective,
    CommonModule,
    FormsModule,
    RouterModule,
    IonButton,
    IonButtons,
    IonContent,
    IonFabButton,
    IonHeader,
    IonIcon,
    IonImg,
    IonInput,
    IonLabel,
    IonModal,
    IonPicker,
    IonPickerColumn,
    IonPickerColumnOption,
    IonSegment,
    IonSegmentButton,
    IonSelect,
    IonSelectOption,
    IonTextarea,
    IonTitle,
    IonToolbar,
  ],
})
export class AddRecipeComponent implements OnInit, OnDestroy {
  public readonly i18n = inject(LocalizationService);
  private router = inject(Router);
  private recipeService = inject(RecipeService);
  private route = inject(ActivatedRoute);
  private labelService = inject(LabelService);
  private imageCompress = inject(NgxImageCompressService);
  private catalog = inject(CatalogService);
  private cdr = inject(ChangeDetectorRef);

  public readonly hourOptions: number[] = Array.from(
    {length: HOURS_MAX + 1},
    (_, i) => i
  );
  public readonly minuteOptions: number[] = Array.from({length: 60}, (_, i) => i);
  public readonly amountUnits: QuantityUnit[] = ['g', 'kg', 'ml', 'l', 'piece', 'bunch', 'pinch'];

  public steps: RecipeStep[] = [];
  public stepIngredientStepId: string | null = null;
  public stepIngredientNumber = 0;
  public stepIngredientDraftIds: string[] = [];
  public saveError = '';
  public saving = false;
  private editVersion = 0;
  private pendingSaves = 0;
  private saveQueue: Promise<void> = Promise.resolve();

  private _name: string = '';
  private _description: string = '';
  private _hours: number = 0;
  private _minutes: number = 0;
  private _prepTime: number = 0;
  private _pickerHours: number = 0;
  private _pickerMinutes: number = 0;
  private _allItems: CatalogNode[] = [];
  private _ingredientModalMode: IngredientModalMode = 'existing';
  private _itemSearchQuery: string = '';
  private _selectedExistingItem: CatalogNode | null = null;
  private _newItemName: string = '';
  private _newItemUnit: QuantityUnit = 'piece';
  private _ingredientAmount: number = 1;
  private _ingredients: Ingredient[] = [];
  private _recipe: Recipe = {} as Recipe;
  private _stringLabels: string[] = [];
  private _templateLabels: Label[] = [];
  private _labels: Label[] = [];
  private _imagePreviewUrl: string = '';
  private _pendingImageBlob: Blob | null = null;
  private _imageRemoved: boolean = false;
  private _imageSelected: boolean = false;
  private _selectedEmoji: string | null = null;
  private _newLabel: string = '';

  private _isNew: boolean = true;
  private _saveStatus: SaveStatus = 'saved';
  private _savePulse: boolean = false;
  private autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
  private pulseTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.catalog.observe().subscribe((items) => {
      this._allItems = items;
      this.cdr.markForCheck();
    });

    const index = this.route.snapshot.paramMap.get('id');
    this._isNew = !index;
    if (index) {
      const recipe = this.recipeService.findById(index);
      const ingredients = this.recipeService.getIngredients(index);
      const templateLabels = this.labelService.getTemplateLabels();
      const recipeLabels = this.labelService.getLabelsForRecipe(index);
      // combineLatest (not forkJoin): findById()/getIngredients()/getTemplateLabels()/getLabelsForRecipe()
      // are live queries (RxDB `.$`) that never complete, so forkJoin would never emit.
      // take(1): this only seeds the form once. Without it, every subsequent
      // emission - including the ones caused by our own autosave writes -
      // would blindly overwrite the local editable fields, clobbering
      // in-progress edits (e.g. keystrokes typed after a save round-trip but
      // before the live query catches up) with the just-saved snapshot.
      combineLatest([
        recipe,
        ingredients,
        templateLabels,
        recipeLabels,
      ]).pipe(take(1)).subscribe(([recipe, ingredients, templateLabels, recipeLabels]) => {
        this._templateLabels = templateLabels;
        this._recipe = recipe;
        this._name = recipe.name;
        this._description = recipe.description;
        this.steps = copyRecipeSteps(recipe.steps);
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
        this.cdr.markForCheck();
      });
      // take(1): image state is managed locally after the initial load
      // (uploadFile/deleteImage), so later live-query emissions - notably
      // the one triggered by our own autosave - shouldn't overwrite it.
      this.recipeService.getImageUrl(index).pipe(take(1)).subscribe((url) => {
        this._imagePreviewUrl = url ?? '';
        this._imageSelected = !!url;
        this.cdr.markForCheck();
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
        this.cdr.markForCheck();
      });
    }
  }

  ngOnDestroy(): void {
    // Don't drop the last 500ms of edits if the user navigates away
    // (e.g. hardware back button) before the debounce fires.
    void this.flushPendingSave();
    if (this.pulseTimer) {
      clearTimeout(this.pulseTimer);
    }
  }

  public async navigateBack(): Promise<void> {
    if (await this.flushPendingSave()) this.doNavigateBack();
  }

  private doNavigateBack(): void {
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

  public saveRecipe(): void {
    if (!this.saving && this._name.trim()) void this.persist(true);
  }

  private persist(navigateAfter: boolean): Promise<boolean> {
    // Capture everything before queuing: a later keystroke must never mutate an in-flight write.
    const recipe: Recipe = {
      id: this.route.snapshot.paramMap.get('id') ?? this._recipe.id,
      name: this._name,
      description: this._description,
      preparationTime: this._prepTime,
      emoji: this._selectedEmoji,
      steps: copyRecipeSteps(this.steps)
    };
    const ingredients = this._ingredients.map(ingredient => ({...ingredient}));
    const labels = this._labels.map(label => ({...label}));
    const image = this._pendingImageBlob;
    const imageRemoved = this._imageRemoved;
    const version = this.editVersion;
    this.pendingSaves++;
    this.saving = true;
    this.saveError = '';
    const task = this.saveQueue.then(async () => {
      this.saveError = '';
      try {
        await firstValueFrom(forkJoin([
          this.recipeService.save(recipe),
          this.labelService.saveLabelsForRecipe(recipe.id, labels),
          this.recipeService.saveIngredients(recipe.id, ingredients)
        ]));
        await firstValueFrom(image
          ? this.recipeService.saveImage(recipe.id, image)
          : imageRemoved ? this.recipeService.deleteImage(recipe.id) : of(void 0));
        this._recipe = recipe;
        if (version === this.editVersion) {
          this._pendingImageBlob = null;
          this._imageRemoved = false;
          this.setSaveStatus('saved');
          if (navigateAfter) this.doNavigateBack();
        }
        return true;
      } catch {
        this.saveError = 'ui.couldNotSaveRecipePleaseTryAgain';
        this.setSaveStatus('unsaved');
        return false;
      } finally {
        this.pendingSaves--;
        this.saving = this.pendingSaves > 0;
        this.cdr.markForCheck();
      }
    });
    // Both success and failure settle the queue so a failed save can be retried.
    this.saveQueue = task.then(() => undefined);
    return task;
  }

  public inputChanged(): boolean {
    return (
      this._saveStatus === 'unsaved' ||
      JSON.stringify(this._recipe.steps ?? []) !== JSON.stringify(this.steps) ||
      this._recipe.name !== this._name ||
      this._recipe.description !== this._description ||
      this._recipe.preparationTime !== this._prepTime ||
      this._pendingImageBlob !== null ||
      this._imageRemoved ||
      (this._recipe.emoji ?? null) !== this._selectedEmoji
    );
  }

  /**
   * Debounces a save 500ms after the last change; restarts on every subsequent
   * edit. Only for editing an existing recipe - a brand-new recipe isn't
   * saved until the user explicitly hits Save (see saveRecipe), so an
   * abandoned "new recipe" form doesn't leave a half-filled entry behind.
   */
  private scheduleAutoSave(): void {
    this.editVersion++;
    this.setSaveStatus('unsaved');
    if (this._isNew) {
      return;
    }
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }
    this.autoSaveTimer = setTimeout(() => {
      this.autoSaveTimer = null;
      void this.persist(false);
    }, AUTO_SAVE_DELAY_MS);
  }

  /** Saves immediately if a debounced save is pending, skipping the wait. */
  private async flushPendingSave(): Promise<boolean> {
    if (this._isNew) return true;
    const version = this.editVersion;
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
      this.autoSaveTimer = null;
      if (!await this.persist(false)) return false;
    } else {
      await this.saveQueue;
      if (this._saveStatus !== 'saved' && !await this.persist(false)) return false;
    }
    // An edit made while navigation awaited an older write still needs to be flushed.
    return version === this.editVersion || this.flushPendingSave();
  }

  public addStep(): void {
    this.steps = [...this.steps, {id: uuidv4(), instructions: '', ingredientIds: []}];
    this.scheduleAutoSave();
  }

  public updateStepInstructions(id: string, instructions: string): void {
    this.steps = this.steps.map(step => step.id === id ? {...step, instructions} : step);
    this.scheduleAutoSave();
  }

  public openStepIngredients(step: RecipeStep): void {
    this.stepIngredientDraftIds = step.ingredientIds.filter(id => this._ingredients.some(item => item.id === id));
    this.stepIngredientStepId = step.id;
    this.stepIngredientNumber = this.steps.findIndex(item => item.id === step.id) + 1;
  }

  public toggleDraftStepIngredient(ingredientId: string, selected: boolean): void {
    this.stepIngredientDraftIds = selected ? [...new Set([...this.stepIngredientDraftIds, ingredientId])]
      : this.stepIngredientDraftIds.filter(id => id !== ingredientId);
  }

  public confirmStepIngredients(): void {
    if (!this.steps.some(step => step.id === this.stepIngredientStepId)) return;
    const ingredientIds = this.stepIngredientDraftIds.filter(id => this._ingredients.some(item => item.id === id));
    this.steps = this.steps.map(step => step.id === this.stepIngredientStepId ? {...step, ingredientIds} : step);
    this.scheduleAutoSave();
    this.closeStepIngredients();
  }

  public closeStepIngredients(): void {
    this.stepIngredientStepId = null;
  }

  public removeStep(id: string): void {
    if (this.stepIngredientStepId === id) this.closeStepIngredients();
    this.steps = this.steps.filter(step => step.id !== id);
    this.scheduleAutoSave();
  }

  public moveStep(index: number, direction: -1 | 1): void {
    const target = index + direction;
    if (target < 0 || target >= this.steps.length) return;
    const steps = [...this.steps];
    [steps[index], steps[target]] = [steps[target], steps[index]];
    this.steps = steps;
    this.scheduleAutoSave();
  }

  private setSaveStatus(status: SaveStatus): void {
    if (this._saveStatus === status) {
      return;
    }
    this._saveStatus = status;
    this._savePulse = true;
    this.cdr.markForCheck();
    if (this.pulseTimer) {
      clearTimeout(this.pulseTimer);
    }
    this.pulseTimer = setTimeout(() => {
      this._savePulse = false;
      this.cdr.markForCheck();
    }, SAVE_PULSE_DURATION_MS);
  }

  /** Resets the modal to a blank "existing item" search. Call right before it opens. */
  public initAddIngredientModal(): void {
    this._ingredientModalMode = 'existing';
    this._itemSearchQuery = '';
    this._selectedExistingItem = null;
    this._newItemName = '';
    this._newItemUnit = 'piece';
    this._ingredientAmount = 1;
  }

  public selectExistingItem(item: CatalogNode): void {
    this._selectedExistingItem = item;
  }

  public canConfirmIngredient(): boolean {
    if (!(this._ingredientAmount > 0)) {
      return false;
    }
    return this._ingredientModalMode === 'existing'
      ? !!this._selectedExistingItem
      : this._newItemName.trim().length > 0;
  }

  /**
   * A recipe requirement may target a category or an exact product.
   */
  public confirmAddIngredient(): void {
    if (!this.canConfirmIngredient()) {
      return;
    }
    if (this._ingredientModalMode === 'existing') {
      if (this._selectedExistingItem) {
        this.pushIngredient(this._selectedExistingItem);
      }
      return;
    }
    void this.catalog.findOrCreateClass(this._newItemName.trim()).then(node => this.pushIngredient(node));
  }

  private pushIngredient(item: CatalogNode): void {
    this._ingredients.push({
      id: uuidv4(),
      recipeId: this._recipe.id,
      targetNodeId: item.id,
      name: item.name,
      amount: this._ingredientAmount,
      unit: this._newItemUnit,
    });
    this.cdr.markForCheck();
    this.scheduleAutoSave();
  }

  public removeIngredient(ingredient: Ingredient) {
    this._ingredients = this._ingredients.filter(item => item.id !== ingredient.id);
    this.steps = this.steps.map(step => ({
      ...step, ingredientIds: step.ingredientIds.filter(id => id !== ingredient.id)
    }));
    this.scheduleAutoSave();
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
        ...(template.origin ? {origin: template.origin} : {}),
        ...(template.translationKey ? {translationKey: template.translationKey} : {}),
      }));
    this.scheduleAutoSave();
  }

  public uploadFile() {
    this.uploadCompressedFile();
  }

  public deleteImage() {
    this._imagePreviewUrl = '';
    this._pendingImageBlob = null;
    this._imageRemoved = true;
    this._imageSelected = false;
    this.scheduleAutoSave();
  }

  private uploadCompressedFile() {
    const MAX_MEGABYTE = 2;
    // uploadAndGetImageWithMaxSize() rejects (rather than resolving) when it
    // can't shrink the file further after the first compression pass - common
    // for already-small images - but the promise still carries a usable
    // data URL in both cases, so both branches accept the image the same way.
    const acceptImage = (result: string) => {
      cropImageToSquare(result, RECIPE_IMAGE_MAX_SIZE).then((cropped) => {
        this._imagePreviewUrl = cropped;
        this._pendingImageBlob = dataUrlToBlob(cropped);
        this._imageRemoved = false;
        this._imageSelected = true;
        this.scheduleAutoSave();
        this.cdr.markForCheck();
      });
    };
    this.imageCompress
      .uploadAndGetImageWithMaxSize(MAX_MEGABYTE)
      .then(acceptImage, acceptImage);
  }

  /** Seeds the picker columns from the current prep time. Call right before the picker opens. */
  public initPrepTimePicker(): void {
    this._pickerHours = this._hours;
    this._pickerMinutes = this._minutes;
  }

  public onPickerHoursChange(event: any): void {
    this._pickerHours = Number(event.detail.value);
  }

  public onPickerMinutesChange(event: any): void {
    this._pickerMinutes = Number(event.detail.value);
  }

  public confirmPrepTimePicker(): void {
    this._hours = this._pickerHours;
    this._minutes = this._pickerMinutes;
    this._prepTime = this._hours * 60 + this._minutes;
    this.scheduleAutoSave();
  }

  get recipe(): Recipe {
    return this._recipe;
  }

  get isNew(): boolean {
    return this._isNew;
  }

  get saveStatus(): SaveStatus {
    return this._saveStatus;
  }

  get savePulse(): boolean {
    return this._savePulse;
  }

  get name(): string {
    return this._name;
  }

  set name(name: string) {
    this._name = name;
    this.scheduleAutoSave();
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
    this.scheduleAutoSave();
  }

  get pickerHours(): number {
    return this._pickerHours;
  }

  get pickerMinutes(): number {
    return this._pickerMinutes;
  }

  get hasPrepTime(): boolean {
    return this._hours > 0 || this._minutes > 0;
  }

  get prepTimeLabel(): string {
    if (this._hours === 0 && this._minutes === 0) {
      return this.i18n.t('ui.noTimeSet');
    }
    return this.i18n.duration(this._hours * 60 + this._minutes);
  }

  get selectedEmoji(): string {
    return this._selectedEmoji ?? '';
  }

  set selectedEmoji(emoji: string) {
    this._selectedEmoji = emoji.trim() ? emoji : null;
    this.scheduleAutoSave();
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

  get imageSelected(): boolean {
    return this._imageSelected;
  }

  get ingredientModalMode(): IngredientModalMode {
    return this._ingredientModalMode;
  }

  set ingredientModalMode(mode: IngredientModalMode) {
    this._ingredientModalMode = mode;
  }

  get itemSearchQuery(): string {
    return this._itemSearchQuery;
  }

  set itemSearchQuery(query: string) {
    this._itemSearchQuery = query;
    this._selectedExistingItem = null;
  }

  get filteredItems(): CatalogNode[] {
    const normalized = this._itemSearchQuery.trim().toLowerCase();
    const items = normalized
      ? this._allItems.filter((item) => this.i18n.name(item).toLocaleLowerCase(this.i18n.locale()).includes(normalized))
      : this._allItems;
    return items.filter(item => item.parentId !== null &&
      this.catalog.matches('root-food', item.id, this._allItems)).slice(0, MAX_ITEM_SUGGESTIONS);
  }

  get selectedExistingItem(): CatalogNode | null {
    return this._selectedExistingItem;
  }

  get newItemName(): string {
    return this._newItemName;
  }

  set newItemName(name: string) {
    this._newItemName = name;
  }

  get newItemUnit(): QuantityUnit {
    return this._newItemUnit;
  }

  set newItemUnit(unit: QuantityUnit) {
    this._newItemUnit = unit;
  }

  get ingredientAmount(): number {
    return this._ingredientAmount;
  }

  set ingredientAmount(amount: number) {
    this._ingredientAmount = amount;
  }

  get newLabel(): string {
    return this._newLabel;
  }

  set newLabel(newLabel: string) {
    this._newLabel = newLabel;
  }
}
