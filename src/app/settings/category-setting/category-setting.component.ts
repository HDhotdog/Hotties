import { Location, CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ItemReorderEventDetail, IonicModule } from '@ionic/angular';
import { CategoryService } from 'src/app/category/category.service';

@Component({
  selector: 'app-category-setting',
  templateUrl: './category-setting.component.html',
  styleUrls: ['./category-setting.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule]
})
export class CategorySettingComponent {

  constructor(
    public categoryService: CategoryService,
    private location: Location,
    private router: Router,
    private route: ActivatedRoute) { }

  async ionViewWillEnter() {
    this.categoryService.loadCategories();
  }

  public addNewCategory() {
    this.router.navigate(['new'], { relativeTo: this.route })
  }

  public editCategory(i: number) {
    this.router.navigate(['new', i], { relativeTo: this.route })
  }

  public navigateBack() {
    this.location.back()
  }

  public deleteCategory(index: number) {
    this.categoryService.categories.splice(index, 1);
    this.categoryService.saveCategories();
  }

  handleReorder(ev: CustomEvent<ItemReorderEventDetail>) {
    [this.categoryService.categories[ev.detail.from], this.categoryService.categories[ev.detail.to]]
      = [this.categoryService.categories[ev.detail.to], this.categoryService.categories[ev.detail.from]];
    this.categoryService.saveCategories();
    ev.detail.complete();
  }
}
