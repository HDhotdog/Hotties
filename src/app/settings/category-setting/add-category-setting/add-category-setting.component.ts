import {CommonModule, Location} from '@angular/common';
import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, RouterModule} from '@angular/router';
import {IonicModule, ToastController} from '@ionic/angular';
import {FormsModule} from '@angular/forms';
import {CategoryService} from 'src/app/category/category.service';
import {v4 as uuidv4} from 'uuid';
import {forkJoin} from 'rxjs';
import {RxCategory} from "../../../category/category";

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
  private _previousInputs: RxCategory = {} as RxCategory;
  private _category: RxCategory | null = null;
  private _categories: RxCategory[] = [];
  private _id: string | null = null;

  constructor(private location: Location,
              private categoryService: CategoryService,
              private toastCtrl: ToastController,
              private route: ActivatedRoute) {
  }

  ngOnInit(): void {
    this._id = this.route.snapshot.paramMap.get('id');

    const categoryObservable = this.categoryService.getCategoryById(this._id as string);
    const categoriesObservable = this.categoryService.getCategories();

    forkJoin([categoryObservable, categoriesObservable]).subscribe(([category, categories]) => {
      this._category = category
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
      let category: RxCategory;
      if (this._category) {
        this._category.name = this._name;
        this._category.saveSuggestions = this._saveSuggestions;
        category = this._category;
      } else {
        category = {
          id: uuidv4(),
          name: this._name,
          saveSuggestions: this._saveSuggestions
        }
      }
      this.categoryService.save(category).subscribe(() => {
        this.navigateBack();
      });
    }
  }

  public inputChanged(): boolean {
    const changed = this._name != this._category?.name || this._saveSuggestions != this._category?.saveSuggestions;
    return changed;
  }

  public editingCategory(): boolean {
    return this.route.snapshot.paramMap.get("id") != null;
  }

  set categories(categories: RxCategory[]) {
    this._categories = categories;
  }

  get categories(): RxCategory[] {
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

  set previousInputs(previousInputs: RxCategory) {
    this._previousInputs = previousInputs;
  }

  get previousInputs(): RxCategory {
    return this._previousInputs;
  }
}
