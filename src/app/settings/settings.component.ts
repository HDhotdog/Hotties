import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Preferences } from '@capacitor/preferences';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-settings',
  templateUrl: 'settings.component.html',
  styleUrls: ['settings.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule]
})
export class SettingsComponent {

  constructor(private router: Router, private route: ActivatedRoute) { }

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
