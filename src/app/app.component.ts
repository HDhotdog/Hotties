import {Component, OnInit} from '@angular/core';
import {AppService} from './app.service';
import {CategoryService} from './category/category.service';
import {Category} from './category/category';
import {LabelGroup} from "./label/models/label.interface";
import {LabelService} from "./settings/label-setting/label-service.service";
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Keyboard } from '@capacitor/keyboard';
import { Platform } from '@ionic/angular';
import { v4 as uuidv4 } from 'uuid';
import { SafeArea } from '@aashu-dubey/capacitor-statusbar-safe-area';
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule]
})
export class AppComponent implements OnInit {
  constructor(
    private appService: AppService, 
    private categoryService: CategoryService,
    private labelService: LabelService,
    private platform: Platform
  ) {
    this.initializeApp();
  }

  initializeApp() {
    this.platform.ready().then(() => {
      // Configure keyboard behavior
      if (this.platform.is('capacitor')) {
        Keyboard.setResizeMode({ mode: 'ionic' as any });
        Keyboard.setScroll({ isDisabled: false });
      }
    });

    this.adjustSafeArea().then((height) => {
      console.log(height);
    });
  }
  

  async adjustSafeArea() {
    const {height} = await SafeArea.getStatusBarHeight();
    document.documentElement.style.setProperty('--ion-safe-area-top', `${height}px`);  
    return height;
  }

  async ngOnInit() {
    await this.appService.loadInitialValues();
    if (this.appService.firstTime) {
      this.initValues()
    }
  }

  private initValues() {
    const category: Category = {
      id: uuidv4(),
      name: "Shopping List",
      elements: [],
      suggestions: [],
      saveSuggestions: true
    }

    const kindLabels: LabelGroup = {
      id: uuidv4(),
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
      id: uuidv4(),
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
    this.labelService.saveLabels([kindLabels, tasteLabels]);
    this.categoryService.save(category);
    this.categoryService.saveLastCategory(0);
    this.appService.firstTime = false;
    this.appService.saveInitalValues();
  }
}
