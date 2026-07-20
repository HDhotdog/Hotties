import { Component, inject } from '@angular/core';
import { IonicModule, Platform } from '@ionic/angular';

import { RouterModule } from '@angular/router';
import { Keyboard } from '@capacitor/keyboard';
import { SafeArea } from '@aashu-dubey/capacitor-statusbar-safe-area';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [IonicModule, RouterModule],
})
export class AppComponent {
  private platform = inject(Platform);

  constructor() {
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
    const { height } = await SafeArea.getStatusBarHeight();
    document.documentElement.style.setProperty(
      '--ion-safe-area-top',
      `${height}px`
    );
    return height;
  }
}
