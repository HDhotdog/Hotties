import {Injectable, isDevMode, makeEnvironmentProviders} from '@angular/core';
import {provideTransloco, TranslocoLoader} from '@jsverse/transloco';
import {provideTranslocoMessageformat} from '@jsverse/transloco-messageformat';
import {of} from 'rxjs';
import {languagePacks} from './languages.generated';

@Injectable({providedIn: 'root'})
class BundledTranslationLoader implements TranslocoLoader {
  getTranslation(language: string) {return of(languagePacks.find(pack => pack.meta.code === language)!.messages);}
}

export function provideLocalization() {
  return makeEnvironmentProviders([
    provideTransloco({config: {
      availableLangs: languagePacks.map(pack => pack.meta.code), defaultLang: 'en', fallbackLang: 'en',
      missingHandler: {useFallbackTranslation: true, logMissingKey: isDevMode()},
      reRenderOnLangChange: true, prodMode: !isDevMode(),
    }, loader: BundledTranslationLoader}),
    provideTranslocoMessageformat({locales: languagePacks.map(pack => pack.meta.locale)}),
  ]);
}
