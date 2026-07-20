import {
  enableProdMode,
  importProvidersFrom,
  provideZoneChangeDetection,
} from '@angular/core';

import { environment } from './environments/environment';

import { defineCustomElements } from '@ionic/pwa-elements/loader';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { AppRoutingModule } from './app/app-routing.module';
import { RouteReuseStrategy } from '@angular/router';
import { DatabaseService } from './app/database/database';

defineCustomElements(window);

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    provideZoneChangeDetection(),
    importProvidersFrom(
      BrowserAnimationsModule,
      IonicModule.forRoot(),
      AppRoutingModule
    ),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    DatabaseService,
  ],
});
