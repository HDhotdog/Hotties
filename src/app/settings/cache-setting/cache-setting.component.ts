import { Location } from '@angular/common';
import { Component } from '@angular/core';
import { Category } from 'src/app/category/category';
import { CategoryService } from 'src/app/category/category.service';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { v4 as uuidv4 } from 'uuid';
@Component({
  selector: 'app-cache-setting',
  templateUrl: './cache-setting.component.html',
  styleUrls: ['./cache-setting.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class CacheSettingComponent {

  constructor(private categoryService: CategoryService,
    private location: Location) {
  }


  public async clearCategoryCache() {
    const category: Category = {
      id: uuidv4(),
      name: "Shopping List",
      elements: [],
      suggestions: [],
      saveSuggestions: true
    }

    this.categoryService.deleteAllCategories().subscribe(() => {
      this.categoryService.initCategories([category]);
      // this.categoryService.saveLastCategory(0);
    });
  }

  public navigateBack() {
    this.location.back()
  }
}
