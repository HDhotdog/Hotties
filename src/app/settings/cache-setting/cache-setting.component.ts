import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CategoryService } from 'src/app/category/category.service';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { v4 as uuidv4 } from 'uuid';
import { switchMap } from 'rxjs';
import {Category} from "../../category/category.dto";
@Component({
  selector: 'app-cache-setting',
  templateUrl: './cache-setting.component.html',
  styleUrls: ['./cache-setting.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class CacheSettingComponent {

  constructor(private categoryService: CategoryService,
    private router: Router) {
  }


  public clearCategoryCache() {
    const category: Category = {
      id: uuidv4(),
      name: "Edeka",
      saveSuggestions: true
    }

    this.categoryService.deleteAllCategories().pipe(
      switchMap(() => this.categoryService.initCategories([category]))
    ).subscribe();
  }

  public navigateBack() {
    // Explicit destination rather than Location.back() (see AddRecipeComponent for why).
    void this.router.navigate(['/tabs/settings']);
  }
}
