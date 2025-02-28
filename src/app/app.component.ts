import {Component, OnInit} from '@angular/core';
import {AppService} from './app.service';
import {CategoryService} from './category/category.service';
import {Category} from './category/category';
import {LabelGroup} from "./label/models/label.interface";
import {LabelService} from "./settings/label-setting/label-service.service";
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule]
})
export class AppComponent implements OnInit {
  constructor(private appService: AppService, private categoryService: CategoryService,
              private labelService: LabelService) {
  }

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

    const kindLabels: LabelGroup = {
      name: "Art",
      labels: [{
        name: "Frühstück"
      },
        {
          name: "Mittagessen"
        },
        {
          name: "Abendessen"
        },
        {
          name: "Snack"
        }
      ]
    }

    const tasteLabels: LabelGroup = {
      name: "Geschmack",
      labels: [
        {
          name: "Süß"
        },
        {
          name: "Scharf"
        },
        {
          name: "Salzig"
        },
        {
          name: "Sauer"
        }
      ]
    }
    this.labelService.labelGroups.push(kindLabels, tasteLabels);
    this.labelService.saveLabels();
    this.categoryService.categories.push(category);
    this.categoryService.saveCategories();
    this.appService.firstTime = false;
    this.appService.saveInitalValues();
  }
}
