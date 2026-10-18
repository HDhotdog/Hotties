import {provideAppInitializer, inject} from '@angular/core';
import {provideLocalization} from './app/i18n/localization.providers';
import {LocalizationService} from './app/i18n/localization.service';
import {
  enableProdMode,
  importProvidersFrom,
  provideZoneChangeDetection,
} from '@angular/core';

import { environment } from './environments/environment';

import { defineCustomElements } from '@ionic/pwa-elements/loader';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';
import { AppRoutingModule } from './app/app-routing.module';
import { RouteReuseStrategy } from '@angular/router';
import { DatabaseService } from './app/database/database';
import {registerAppIcons} from './app/app-icons';

registerAppIcons();
defineCustomElements(window);

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    provideLocalization(),
    provideAppInitializer(() => inject(LocalizationService).initialize()),
    provideZoneChangeDetection(),
    provideIonicAngular(),
    importProvidersFrom(AppRoutingModule),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    DatabaseService,
  ],
});
