import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-settings',
  templateUrl: 'settings.component.html',
  styleUrls: ['settings.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [IonicModule, RouterModule],
})
export class SettingsComponent {
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  public openCacheSetting() {
    this.router.navigate(['cache'], { relativeTo: this.route });
  }

  public openCategorySetting() {
    this.router.navigate(['category'], { relativeTo: this.route });
  }

  public openLabelSetting() {
    this.router.navigate(['label'], { relativeTo: this.route });
  }
}
