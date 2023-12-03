import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CategoryService } from 'src/app/category/category.service';

@Component({
  selector: 'app-category-setting',
  templateUrl: './category-setting.component.html',
  styleUrls: ['./category-setting.component.scss'],
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
}
