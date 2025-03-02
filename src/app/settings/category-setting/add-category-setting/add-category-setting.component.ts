import { Location, CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ToastController, IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { Category } from 'src/app/category/category';
import { CategoryService } from 'src/app/category/category.service';
import { v4 as uuidv4 } from 'uuid';
import { forkJoin } from 'rxjs';
@Component({
  selector: 'app-add-category-setting',
  templateUrl: './add-category-setting.component.html',
  styleUrls: ['./add-category-setting.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, RouterModule]
})
export class AddCategorySettingComponent implements OnInit {

  private _name: string = "";
  private _saveSuggestions: boolean = true;
  private _previousInputs: Category = {} as Category;
  private _category: Category | null = null;
  private _categories: Category[] = [];
  private _id: string | null = null;

  constructor(private location: Location,
    private categoryService: CategoryService,
    private toastCtrl: ToastController,
    private route: ActivatedRoute) { }

  ngOnInit(): void {
    this._id = this.route.snapshot.paramMap.get('id');

    const categoryObservable = this.categoryService.getCategoryById(this._id as string);
    const categoriesObservable = this.categoryService.getCategories();

    forkJoin([categoryObservable, categoriesObservable]).subscribe(([category, categories]) => {
      this._category = category.getOrElse(null);
      this._categories = categories;

      if (this._category) {
        this._name = this._category.name;
        this._saveSuggestions = this._category.saveSuggestions;
      } else {
        this._name = "";
        this._saveSuggestions = true;
      }
    });
  }

  public navigateBack() {
    this.location.back();
  }

  public saveCategory() {
    if (this._categories.filter(category => category.name == this._name).length > 0) {
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
      if (this._category) {
        this._category.name = this._name;
        this._category.saveSuggestions = this._saveSuggestions;
        this.categoryService.save(this._category);
      } else {
        const category: Category = {
          id: uuidv4(),
          name: this._name,
          elements: [],
          suggestions: [],
          saveSuggestions: this._saveSuggestions
        }
        this.categoryService.save(category);
      }
      this.navigateBack();
    }
  }

  public inputChanged(): boolean {
    const changed = this._name != this._category?.name || this._saveSuggestions != this._category?.saveSuggestions;
    return changed;
  }

  public editingCategory(): boolean {
    return this.route.snapshot.paramMap.get("id") != null;
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
