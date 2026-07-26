import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

export interface LanguageOption {
  code: string;
  /** Always shown in this language's own name (e.g. "Deutsch"), never translated - a German speaker must recognize it regardless of the app's current language. */
  nativeName: string;
}

const STORAGE_KEY = 'hottiesLanguage';

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', nativeName: 'English' },
  { code: 'de', nativeName: 'Deutsch' },
];

const DEFAULT_LANGUAGE = 'en';

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private translate = inject(TranslateService);

  public readonly supportedLanguages = SUPPORTED_LANGUAGES;

  /** Applies the persisted language (or a supported browser default) before first render. */
  public async init(): Promise<void> {
    this.translate.addLangs(SUPPORTED_LANGUAGES.map((lang) => lang.code));
    this.translate.setDefaultLang(DEFAULT_LANGUAGE);
    await firstValueFrom(this.translate.use(this.getCurrentLanguage()));
  }

  public getCurrentLanguage(): string {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && this.isSupported(stored)) {
      return stored;
    }

    const browserLang = this.translate.getBrowserLang();
    return browserLang && this.isSupported(browserLang) ? browserLang : DEFAULT_LANGUAGE;
  }

  public async setLanguage(code: string): Promise<void> {
    if (!this.isSupported(code)) {
      return;
    }

    localStorage.setItem(STORAGE_KEY, code);
    await firstValueFrom(this.translate.use(code));
  }

  private isSupported(code: string): boolean {
    return SUPPORTED_LANGUAGES.some((lang) => lang.code === code);
  }
}
