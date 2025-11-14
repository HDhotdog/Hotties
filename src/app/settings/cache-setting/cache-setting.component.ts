import { Location } from '@angular/common';
import { Component } from '@angular/core';
import { CategoryService } from 'src/app/category/category.service';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { v4 as uuidv4 } from 'uuid';
import {RxCategory} from "../../category/category";
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
    const category: RxCategory = {
      id: uuidv4(),
      name: "Edeka",
      saveSuggestions: true
    }

    this.categoryService.deleteAllCategories().subscribe(() => {
      this.categoryService.initCategories([category]);
    });
  }

  public navigateBack() {
    this.location.back()
  }
}
