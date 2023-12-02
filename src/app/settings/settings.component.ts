import { Component } from '@angular/core';
import { ActivatedRoute, Route, Router } from '@angular/router';

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
}
