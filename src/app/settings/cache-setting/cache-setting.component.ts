import { Location } from '@angular/common';
import { Component } from '@angular/core';
import { Category } from 'src/app/category/category';
import { CategoryService } from 'src/app/category/category.service';

@Component({
  selector: 'app-cache-setting',
  templateUrl: './cache-setting.component.html',
  styleUrls: ['./cache-setting.component.scss'],
})
export class CacheSettingComponent {

  constructor(private categoryService: CategoryService,
    private location: Location) {
  }


  public async clearCategoryCache() {
    const category: Category = {
      name: "Shopping List",
      elements: [],
      suggestions: [],
      saveSuggestions: true
    }

    this.categoryService.categories = [category] 
    this.categoryService.saveCategories();
  }

  public navigateBack() {
    this.location.back()
  }
}
