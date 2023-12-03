import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Preferences } from '@capacitor/preferences';

@Component({
  selector: 'app-settings',
  templateUrl: 'settings.component.html',
  styleUrls: ['settings.component.scss']
})
export class SettingsComponent {

  constructor(private router: Router, private route: ActivatedRoute) { }

  public openCacheSetting() {
    this.router.navigate(['cache'], { relativeTo: this.route });    
  }

  public openCategorySetting() {
    this.router.navigate(['category'], { relativeTo: this.route });
  }
}
