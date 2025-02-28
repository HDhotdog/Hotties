import { Location, CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ToastController, IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { Category } from 'src/app/category/category';
import { CategoryService } from 'src/app/category/category.service';

@Component({
  selector: 'app-add-category-setting',
  templateUrl: './add-category-setting.component.html',
  styleUrls: ['./add-category-setting.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, RouterModule]
})
export class AddCategorySettingComponent implements OnInit {

  public name: string = "";
  public saveSuggestions: boolean = true;
  public previousInputs: Category = {} as Category

  constructor(private location: Location,
    private categoryService: CategoryService,
    private toastCtrl: ToastController,
    private route: ActivatedRoute) { }

  ngOnInit(): void {
    const index = this.route.snapshot.paramMap.get('id');
    if (index) {
      const i = parseInt(index);
      this.previousInputs = this.categoryService.categories[i];
      this.name = this.previousInputs.name;
      this.saveSuggestions = this.previousInputs.saveSuggestions;
    } else {
      this.previousInputs = {
        name: this.name,
        saveSuggestions: this.saveSuggestions
      } as Category;
    }
  }

  public navigateBack() {
    this.location.back();
  }

  public saveCategory() {
    if (this.categoryService.categories.filter(category => category.name == this.name).length > 0) {
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
        this.categoryService.categories[parseInt(index)].name = this.name;
        this.categoryService.categories[parseInt(index)].saveSuggestions = this.saveSuggestions;
      } else {
        const category: Category = {
          name: this.name,
          elements: [],
          suggestions: [],
          saveSuggestions: this.saveSuggestions
        }
        this.categoryService.categories.push(category);
      }
      this.categoryService.saveCategories();
      this.navigateBack();
    }
  }

  public inputChanged(): boolean {
    const changed = this.name != this.previousInputs.name || this.saveSuggestions != this.previousInputs.saveSuggestions;
    return changed;
  }

  public editingCategory(): boolean {
    return this.route.snapshot.paramMap.get("id") != null;
  }
}
