import { IonicModule } from '@ionic/angular';

import { RouterModule } from '@angular/router';
import { MenuController } from '@ionic/angular';
import { Component, inject } from '@angular/core';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  standalone: true,
  imports: [IonicModule, RouterModule],
})
export class TabsPage {
  private menu = inject(MenuController);

  openMenu() {
    this.menu.open('main-menu');
  }

  closeMenu() {
    this.menu.close('main-menu');
  }
}
