import {LocalizationService} from '../i18n/localization.service';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenu,
  IonRouterLink,
  IonRouterOutlet,
  IonTitle,
  IonToolbar,
  MenuController,
} from '@ionic/angular';

import {RouterModule} from '@angular/router';
import {ChangeDetectionStrategy, Component, inject} from '@angular/core';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    RouterModule,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonMenu,
    IonRouterOutlet,
    IonTitle,
    IonToolbar,
    IonRouterLink,
  ],
})
export class TabsPage {
  public readonly i18n = inject(LocalizationService);
  private menu = inject(MenuController);

  openMenu() {
    this.menu.open('main-menu');
  }

  closeMenu() {
    this.menu.close('main-menu');
  }
}
