import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonTitle,
  IonToolbar,
  MenuController,
} from '@ionic/angular';
import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {ActivatedRoute, Router, RouterModule} from '@angular/router';

@Component({
  selector: 'app-settings',
  templateUrl: 'settings.component.html',
  styleUrls: ['settings.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
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
    IonTitle,
    IonToolbar,
  ],
})
export class SettingsComponent {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private menuController = inject(MenuController);

  public openMainMenu(): void {
    this.menuController.open('main-menu');
  }

  public openCacheSetting() {
    this.router.navigate(['cache'], {relativeTo: this.route});
  }

  public openCategorySetting() {
    this.router.navigate(['category'], {relativeTo: this.route});
  }

  public openLabelSetting() {
    this.router.navigate(['label'], {relativeTo: this.route});
  }

  public openInfoSetting() {
    this.router.navigate(['info'], {relativeTo: this.route});
  }

  public openAiModels(): void {
    void this.router.navigate(['ai-models'], {relativeTo: this.route});
  }
}
