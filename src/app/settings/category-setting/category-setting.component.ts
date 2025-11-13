import { Location, CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ItemReorderEventDetail, IonicModule } from '@ionic/angular';
import { Category } from 'src/app/category/category';
import { CategoryService } from 'src/app/category/category.service';

@Component({
  selector: 'app-category-setting',
  templateUrl: './category-setting.component.html',
  styleUrls: ['./category-setting.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule]
})
export class CategorySettingComponent {

  private _categories: Category[] = [];

  constructor(
    private categoryService: CategoryService,
    private location: Location,
    private router: Router,
    private route: ActivatedRoute) { }

  async ionViewWillEnter() {
    this.categoryService.getCategories().subscribe((categories) => {
      this._categories = categories;
    });
  }

  public addNewCategory() {
    this.router.navigate(['new'], { relativeTo: this.route })
  }

  public editCategory(id: string) {
    this.router.navigate(['new', id], { relativeTo: this.route })
  }

  public navigateBack() {
    this.location.back()
  }

  public deleteCategory(id: string) {
    this.categoryService.deleteCategory(id);
    this._categories = this._categories.filter((category) => category.id !== id);
  }

  handleReorder(ev: CustomEvent<ItemReorderEventDetail>) {
    [this._categories[ev.detail.from], this._categories[ev.detail.to]]
      = [this._categories[ev.detail.to], this._categories[ev.detail.from]];
    this.categoryService.saveAll(this._categories).subscribe(() => {
      ev.detail.complete();
    });
  }

  get categories(): Category[] {
    return this._categories;
  }
}
