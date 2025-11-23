import {Component, OnInit} from '@angular/core';
import {RxLabel, RxLabelGroup} from "./label/models/label";
import {LabelService} from "./label/label-service.service";
import {IonicModule, Platform} from '@ionic/angular';
import {CommonModule} from '@angular/common';
import {RouterModule} from '@angular/router';
import {Keyboard} from '@capacitor/keyboard';
import {v4 as UUIDv4} from 'uuid';
import {SafeArea} from '@aashu-dubey/capacitor-statusbar-safe-area';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule]
})
export class AppComponent implements OnInit {
  constructor(
    private labelService: LabelService,
    private platform: Platform
  ) {
    this.initializeApp();
  }

  initializeApp() {
    this.platform.ready().then(() => {
      // Configure keyboard behavior
      if (this.platform.is('capacitor')) {
        Keyboard.setResizeMode({mode: 'ionic' as any});
        Keyboard.setScroll({isDisabled: false});
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
    await this.initValues();
  }

  private async initValues() {
    const kindLabelGroup: RxLabelGroup = {
      id: UUIDv4(),
      name: "Art",
    }

    const kinds = ["Frühstück", "Mittagessen", "Abendessen", "Snack"];
    const kindLabels: RxLabel[] = kinds.map((kind) => {
      return {
        id: UUIDv4(),
        name: kind,
        groupId: kindLabelGroup.id,
        recipeId: ""
      }
    })

    const tasteLabelGroup: RxLabelGroup = {
      id: UUIDv4(),
      name: "Geschmack"
    }

    const tastes = ["Süß", "Scharf", "Salzig", "Sauer"]
    const tasteLabels: RxLabel[] = tastes.map((taste) => {
      return {
        id: UUIDv4(),
        name: taste,
        groupId: tasteLabelGroup.id,
        recipeId: ""
      }
    })
    this.labelService.saveAllGroups([kindLabelGroup, tasteLabelGroup]).subscribe();
    this.labelService.saveAllLabels(kindLabels.concat(tasteLabels)).subscribe();
  }
}
