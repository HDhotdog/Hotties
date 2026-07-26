import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { IonicModule, MenuController } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-settings',
  templateUrl: 'settings.component.html',
  styleUrls: ['settings.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [IonicModule, RouterModule, TranslateModule],
})
export class SettingsComponent {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private menuController = inject(MenuController);

  public openMainMenu(): void {
    this.menuController.open('main-menu');
  }

  public openCacheSetting() {
    this.router.navigate(['cache'], { relativeTo: this.route });
  }

  public openCategorySetting() {
    this.router.navigate(['category'], { relativeTo: this.route });
  }

  public openLabelSetting() {
    this.router.navigate(['label'], { relativeTo: this.route });
  }

  public openInfoSetting() {
    this.router.navigate(['info'], { relativeTo: this.route });
  }

  public openLanguageSetting() {
    this.router.navigate(['language'], { relativeTo: this.route });
  }
}
