import {IonApp, IonRouterOutlet, Platform,} from '@ionic/angular';
import {ChangeDetectionStrategy, Component, inject} from '@angular/core';

import {RouterModule} from '@angular/router';
import {Keyboard} from '@capacitor/keyboard';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    RouterModule,
    IonApp,
    IonRouterOutlet,
  ],
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
        Keyboard.setResizeMode({mode: 'ionic' as any});
        Keyboard.setScroll({isDisabled: false});
      }
    });
  }
}
