import {
  enableProdMode,
  importProvidersFrom,
  provideAppInitializer,
  provideZoneChangeDetection,
  inject,
} from '@angular/core';

import { environment } from './environments/environment';

import { defineCustomElements } from '@ionic/pwa-elements/loader';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { AppRoutingModule } from './app/app-routing.module';
import { RouteReuseStrategy } from '@angular/router';
import { DatabaseService } from './app/database/database';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { LanguageService } from './app/settings/language/language.service';

defineCustomElements(window);

if (environment.production) {
  enableProdMode();
}

function createTranslateLoader(http: HttpClient): TranslateLoader {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

bootstrapApplication(AppComponent, {
  providers: [
    provideZoneChangeDetection(),
    provideHttpClient(),
    importProvidersFrom(
      IonicModule.forRoot(),
      AppRoutingModule,
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: createTranslateLoader,
          deps: [HttpClient],
        },
      }),
    ),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    DatabaseService,
    provideAppInitializer(() => inject(LanguageService).init()),
  ],
});
