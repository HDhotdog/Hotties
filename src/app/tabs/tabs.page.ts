import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MenuController } from '@ionic/angular';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule]
})
export class TabsPage {

  constructor(
    private menu: MenuController,
    private router: Router
  ) { }

  openMenu() {
    this.menu.open('main-menu');
  }

  closeMenu() {
    this.menu.close('main-menu');
  }

  getTitle(): string {
    const currentUrl = this.router.url;
    if (currentUrl.includes('/recipe')) {
      return 'Recipes';
    } else if (currentUrl.includes('/todo')) {
      return 'ToDo\'s';
    } else if (currentUrl.includes('/settings')) {
      return 'Settings';
    }
    return '';
  }

  isRecipeRoute(): boolean {
    return this.router.url.includes('/recipe');
  }

  addRecipe() {
    this.router.navigate(['/tabs/recipe/new']);
  }
}
