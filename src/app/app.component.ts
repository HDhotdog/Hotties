import { Component, OnInit } from '@angular/core';
import { AppService } from './app.service';
import { CategoryService } from './category/category.service';
import { Category } from './category/category';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent implements OnInit {
  constructor(private appService: AppService, private categoryService: CategoryService) { }

  async ngOnInit() {
    await this.appService.loadInitialValues();
    if (this.appService.firstTime) {
      this.initValues()
    }
  }

  private initValues() {
    const category: Category = {
      name: "Shopping List",
      elements: [],
      suggestions: [],
      saveSuggestions: true
    }
    this.categoryService.categories.push(category);
    this.categoryService.saveCategories();
    this.appService.firstTime = false;
    this.appService.saveInitalValues();
  }
}
