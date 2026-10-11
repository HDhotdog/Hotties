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
  arrowForwardOutline,
  arrowRedo,
  arrowUp,
  basketOutline,
  bookOutline,
  calendarOutline,
  cartOutline,
  checkmark,
  checkmarkCircle,
  checkmarkOutline,
  chevronDownOutline,
  chevronForwardOutline,
  close,
  closeCircle,
  closeCircleOutline,
  closeOutline,
  colorPalette,
  ellipseOutline,
  filter,
  imageOutline,
  informationCircleOutline,
  leaf,
  list,
  menu,
  options,
  optionsOutline,
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
  trashOutline,
} from 'ionicons/icons';

// Standalone IonIcon resolves template names from this registry.
addIcons({
  add,
  addCircle,
  addOutline,
  alert,
  arrowBack,
  arrowDown,
  arrowForwardOutline,
  arrowRedo,
  arrowUp,
  basketOutline,
  bookOutline,
  calendarOutline,
  cartOutline,
  checkmark,
  checkmarkCircle,
  checkmarkOutline,
  chevronDownOutline,
  chevronForwardOutline,
  close,
  closeCircle,
  closeCircleOutline,
  closeOutline,
  colorPalette,
  ellipseOutline,
  filter,
  imageOutline,
  informationCircleOutline,
  leaf,
  list,
  menu,
  options,
  optionsOutline,
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
  trashOutline,
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
