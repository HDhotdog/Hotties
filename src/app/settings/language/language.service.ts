import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export interface LanguageOption {
  code: string;
  labelKey: string;
}

const STORAGE_KEY = 'hottiesLanguage';

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', labelKey: 'settings.language_setting.english' },
  { code: 'de', labelKey: 'settings.language_setting.german' },
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
    await this.translate.use(this.getCurrentLanguage()).toPromise();
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
    await this.translate.use(code).toPromise();
  }

  private isSupported(code: string): boolean {
    return SUPPORTED_LANGUAGES.some((lang) => lang.code === code);
  }
}
