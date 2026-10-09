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
import { addIcons } from 'ionicons';
import {
  add,
  addCircle,
  addOutline,
  alert,
  arrowBack,
  arrowDown,
  arrowRedo,
  arrowUp,
  calendarOutline,
  cartOutline,
  checkmark,
  checkmarkOutline,
  close,
  closeCircle,
  closeCircleOutline,
  colorPalette,
  filter,
  imageOutline,
  informationCircleOutline,
  leaf,
  list,
  menu,
  pencil,
  pizza,
  pizzaOutline,
  pricetagsOutline,
  removeOutline,
  save,
  scanOutline,
  settingsOutline,
  snowOutline,
  textOutline,
  timeOutline,
  trash,
} from 'ionicons/icons';

// Standalone IonIcon resolves template names from this registry.
addIcons({
  add,
  addCircle,
  addOutline,
  alert,
  arrowBack,
  arrowDown,
  arrowRedo,
  arrowUp,
  calendarOutline,
  cartOutline,
  checkmark,
  checkmarkOutline,
  close,
  closeCircle,
  closeCircleOutline,
  colorPalette,
  filter,
  imageOutline,
  informationCircleOutline,
  leaf,
  list,
  menu,
  pencil,
  pizza,
  pizzaOutline,
  pricetagsOutline,
  removeOutline,
  save,
  scanOutline,
  settingsOutline,
  snowOutline,
  textOutline,
  timeOutline,
  trash,
});
defineCustomElements(window);

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    provideZoneChangeDetection(),
    provideIonicAngular(),
    importProvidersFrom(AppRoutingModule),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    DatabaseService,
  ],
});
