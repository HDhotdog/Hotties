import {Message, message} from '../../i18n/language-pack';
import {LocalizationService} from '../../i18n/localization.service';
import {
  AlertController, IonButton, IonButtons, IonContent, IonHeader, IonIcon,
  IonReorder, IonReorderGroup, IonTitle, IonToolbar, ReorderEndEventDetail,
} from '@ionic/angular';
import {ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, OnInit} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {FormsModule} from '@angular/forms';
import {Router} from '@angular/router';
import {firstValueFrom} from 'rxjs';
import {v4 as uuidv4} from 'uuid';
import {CategoryService} from '../../category/category.service';
import {Category} from '../../category/category.dto';

@Component({
  selector: 'app-category-setting',
  templateUrl: './category-setting.component.html',
  styleUrls: ['./category-setting.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IonButton, IonButtons, IonContent, IonHeader, IonIcon,
    IonReorder, IonReorderGroup, IonTitle, IonToolbar],
})
export class CategorySettingComponent implements OnInit {
  public readonly i18n = inject(LocalizationService);
  private categoryService = inject(CategoryService);
  private router = inject(Router);
  private alerts = inject(AlertController);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  categories: Category[] = [];
  newListName = '';
  editingList: Category | null = null;
  editName = '';
  editSaveSuggestions = true;
  busy = false;
  reordering = false;
  error: Message = '';

  ngOnInit() {
    this.categoryService.getCategories().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(categories => {
      if (!this.reordering) this.categories = categories;
      this.cdr.markForCheck();
    });
  }

  async addList() {
    const name = this.newListName.trim();
    if (!name || this.busy) return;
    if (!this.validName(name)) return;
    const draft = this.newListName;
    this.busy = true;
    this.error = '';
    try {
      await firstValueFrom(this.categoryService.save({
        id: uuidv4(), name, saveSuggestions: true,
        sortOrder: Math.max(-1, ...this.categories.map(list => list.sortOrder ?? 0)) + 1,
      }));
      if (this.newListName === draft) this.newListName = '';
    } catch {
      this.error = 'ui.couldNotAddTheShoppingListPleaseTryAgain';
    } finally {
      this.busy = false;
      this.cdr.markForCheck();
    }
  }

  startEditing(list: Category) {
    if (this.busy) return;
    this.editingList = list;
    this.editName = list.name;
    this.editSaveSuggestions = list.saveSuggestions;
    this.error = '';
  }

  async saveEdit() {
    const name = this.editName.trim();
    if (!this.editingList || !name || this.busy) return;
    if (!this.validName(name, this.editingList.id)) return;
    this.busy = true;
    this.error = '';
    try {
      await firstValueFrom(this.categoryService.save({
        ...this.editingList, name, saveSuggestions: this.editSaveSuggestions,
      }));
      this.cancelEdit();
    } catch {
      this.error = 'ui.couldNotSaveTheShoppingListPleaseTryAgain';
    } finally {
      this.busy = false;
      this.cdr.markForCheck();
    }
  }

  cancelEdit() {
    this.editingList = null;
    this.editName = '';
  }

  private validName(name: string, id?: string): boolean {
    if (name.length > 255) {
      this.error = 'ui.shoppingListNamesCanHaveAtMost255Characters';
      return false;
    }
    if (this.categories.some(list => list.id !== id && list.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      this.error = 'ui.aShoppingListWithThisNameAlreadyExists';
      return false;
    }
    return true;
  }

  async deleteList(list: Category) {
    if (this.busy || this.categories.length <= 1) return;
    this.busy = true;
    this.error = '';
    try {
      const count = await this.categoryService.getItemCount(list.id);
      if (count > 0) {
        const alert = await this.alerts.create({
          header: this.i18n.t('ui.deleteShoppingList2'),
          subHeader: list.name,
          message: this.i18n.t('shopping.deleteMessage', {count, name: list.name}),
          buttons: [
            {text: this.i18n.t('ui.cancel'), role: 'cancel'},
            {text: this.i18n.t('ui.deleteListAndItems'), role: 'confirm', cssClass: 'alert-button-danger'},
          ],
        });
        await alert.present();
        if ((await alert.onDidDismiss()).role !== 'confirm') return;
      }
      await firstValueFrom(this.categoryService.deleteCategory(list.id, count));
      if (this.editingList?.id === list.id) this.cancelEdit();
    } catch (error) {
      this.error = this.i18n.error(error);
    } finally {
      this.busy = false;
      this.cdr.markForCheck();
    }
  }

  get reorderDisabled(): boolean {
    return this.busy || !!this.editingList;
  }

  async reorderLists(event: CustomEvent<ReorderEndEventDetail>) {
    event.stopPropagation();
    event.detail.complete(false);
    const {from, to} = event.detail;
    if (from === to || this.reorderDisabled) return;
    const previous = this.categories;
    const ordered = [...previous];
    const [list] = ordered.splice(from, 1);
    ordered.splice(to, 0, list);
    this.categories = ordered.map((entry, sortOrder) => ({...entry, sortOrder}));
    this.busy = true;
    this.reordering = true;
    this.error = '';
    try {
      await firstValueFrom(this.categoryService.saveAll(this.categories));
    } catch {
      this.categories = previous;
      this.error = 'ui.couldNotSaveTheShoppingListOrderPleaseTryAgain';
    } finally {
      this.busy = false;
      this.reordering = false;
      this.cdr.markForCheck();
    }
  }

  navigateBack() {
    void this.router.navigate(['/tabs/settings']);
  }
}
