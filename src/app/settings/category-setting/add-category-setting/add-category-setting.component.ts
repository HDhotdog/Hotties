import {
  IonButton,
  IonButtons,
  IonContent,
  IonGrid,
  IonHeader,
  IonIcon,
  IonInput,
  IonLabel,
  IonRow,
  IonTitle,
  IonToggle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';
import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  inject,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CategoryService } from '../../../category/category.service';
import { v4 as uuidv4 } from 'uuid';
import { combineLatest } from 'rxjs';
import { Category } from '../../../category/category.dto';

@Component({
  selector: 'app-add-category-setting',
  templateUrl: './add-category-setting.component.html',
  styleUrls: ['./add-category-setting.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    IonButton,
    IonButtons,
    IonContent,
    IonGrid,
    IonHeader,
    IonIcon,
    IonInput,
    IonLabel,
    IonRow,
    IonTitle,
    IonToggle,
    IonToolbar,
  ],
})
export class AddCategorySettingComponent implements OnInit {
  private router = inject(Router);
  private categoryService = inject(CategoryService);
  private toastCtrl = inject(ToastController);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  private _name: string = '';
  private _saveSuggestions: boolean = true;
  private _previousInputs: Category = {} as Category;
  private _category: Category | null = null;
  private _categories: Category[] = [];
  private _id: string | null = null;

  ngOnInit(): void {
    this._id = this.route.snapshot.paramMap.get('id');
    const categoriesObservable = this.categoryService.getCategories();

    if (this._id) {
      // combineLatest (not forkJoin): getCategoryById()/getCategories() are live queries
      // (RxDB `.$`) that never complete, so forkJoin would never emit.
      const categoryObservable = this.categoryService.getCategoryById(this._id);
      combineLatest([categoryObservable, categoriesObservable]).subscribe(
        ([category, categories]) => {
          this._category = category;
          this._categories = categories;
          this._name = category.name;
          this._saveSuggestions = category.saveSuggestions;
          this.cdr.markForCheck();
        }
      );
    } else {
      categoriesObservable.subscribe((categories) => {
        this._categories = categories;
        this._name = '';
        this._saveSuggestions = true;
        this.cdr.markForCheck();
      });
    }
  }

  public navigateBack() {
    // Explicit destination rather than Location.back() (see AddRecipeComponent for why).
    void this.router.navigate(['/tabs/settings/category']);
  }

  public saveCategory() {
    if (
      this._categories.filter((category) => category.name == this._name)
        .length > 0
    ) {
      let toast = this.toastCtrl.create({
        message: 'There already exists a category with this name',
        duration: 2000,
        position: 'bottom',
        color: 'danger',
      });
      toast.then((toast) => {
        toast.present();
      });
    } else {
      let category: Category;
      if (this._category) {
        this._category.name = this._name;
        this._category.saveSuggestions = this._saveSuggestions;
        category = this._category;
      } else {
        category = {
          id: uuidv4(),
          name: this._name,
          saveSuggestions: this._saveSuggestions,
        };
      }
      this.categoryService.save(category).subscribe(() => {
        this.navigateBack();
      });
    }
  }

  public inputChanged(): boolean {
    const changed =
      this._name != this._category?.name ||
      this._saveSuggestions != this._category?.saveSuggestions;
    return changed;
  }

  public editingCategory(): boolean {
    return this.route.snapshot.paramMap.get('id') != null;
  }

  set categories(categories: Category[]) {
    this._categories = categories;
  }

  get categories(): Category[] {
    return this._categories;
  }

  set name(name: string) {
    this._name = name;
  }

  get name(): string {
    return this._name;
  }

  set saveSuggestions(saveSuggestions: boolean) {
    this._saveSuggestions = saveSuggestions;
  }

  get saveSuggestions(): boolean {
    return this._saveSuggestions;
  }

  set previousInputs(previousInputs: Category) {
    this._previousInputs = previousInputs;
  }

  get previousInputs(): Category {
    return this._previousInputs;
  }
}
