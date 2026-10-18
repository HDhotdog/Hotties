import {DOCUMENT} from '@angular/common';
import {computed, inject, Injectable, Injector, signal} from '@angular/core';
import {TranslocoService} from '@jsverse/transloco';
import {firstValueFrom, Subject, take} from 'rxjs';
import {SettingsRepository} from '../database/settings/settings.repository';
import {languagePacks} from './languages.generated';
import {AppError, Message, message} from './language-pack';

const LANGUAGE_KEY = 'language';
const nativeErrors: Record<string, string> = {
  SPEECH_UNAVAILABLE: 'speech.unavailable', SPEECH_LANGUAGE_UNAVAILABLE: 'speech.languageUnavailable',
  MICROPHONE_DENIED: 'speech.permissionDenied', SPEECH_BUSY: 'speech.busy', SPEECH_NO_MATCH: 'speech.noMatch',
  SPEECH_CANCELLED: 'speech.cancelled', MODEL_STATUS_FAILED: 'errors.modelStatus', MODEL_DOWNLOAD_FAILED: 'errors.modelDownload',
  MODEL_DELETE_FAILED: 'errors.modelDelete', MODEL_INTEGRITY_FAILED: 'errors.modelIntegrity',
  NETWORK_UNAVAILABLE: 'errors.modelNetwork', CELLULAR_CONFIRMATION_REQUIRED: 'errors.cellularConfirmation',
};

@Injectable({providedIn: 'root'})
export class LocalizationService {
  private readonly transloco = inject(TranslocoService);
  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);
  private readonly active = signal('en');
  public readonly language = this.active.asReadonly();
  public readonly languages = languagePacks.map(pack => pack.meta);
  public readonly pack = computed(() => languagePacks.find(pack => pack.meta.code === this.active())!);
  public readonly locale = computed(() => this.pack().meta.locale);
  public readonly languageChanged = new Subject<string>();
  private pending: Promise<void> = Promise.resolve();

  constructor() {
    for (const pack of languagePacks) this.transloco.setTranslation(pack.messages, pack.meta.code);
    this.apply('en');
  }

  public async initialize(): Promise<void> {
    try {
      const saved = await firstValueFrom(this.injector.get(SettingsRepository).findByKey(LANGUAGE_KEY).pipe(take(1)));
      this.apply(this.languages.some(lang => lang.code === saved?.value) ? saved!.value : 'en');
    } catch (error) {console.error('Could not restore language preference.', error); this.apply('en');}
  }

  public setLanguage(language: string): Promise<void> {
    const operation = this.pending.then(async () => {
      if (!this.languages.some(lang => lang.code === language)) throw new AppError('errors.unsupportedLanguage', 'Unsupported language.');
      if (language === this.active()) return;
      try {await firstValueFrom(this.injector.get(SettingsRepository).save({key: LANGUAGE_KEY, value: language}));}
      catch (error) {console.error('Could not persist language preference.', error); throw new AppError('errors.saveLanguage', 'Could not save language.');}
      this.apply(language);
    });
    this.pending = operation.catch(() => {});
    return operation;
  }

  private apply(language: string): void {
    this.transloco.setActiveLang(language);
    this.active.set(language);
    this.document.documentElement.lang = this.pack().meta.code;
    this.document.documentElement.dir = this.pack().meta.direction;
    this.languageChanged.next(language);
  }

  public t(value: Message | null | undefined, params: Record<string, unknown> = {}): string {
    if (!value) return '';
    const key = typeof value === 'string' ? value : value.key;
    const language = this.active();
    // Literal user content is never passed through the translation catalog.
    return this.transloco.translate(key, typeof value === 'string' ? params : value.params, language);
  }

  public error(error: unknown): Message {
    if (error instanceof AppError) return message(error.translationKey, error.params);
    const code = (error as {code?: string})?.code;
    if (code && nativeErrors[code]) return nativeErrors[code];
    console.error('Unexpected application error.', error);
    return 'errors.generic';
  }

  public name(value: {name: string; origin?: 'app' | 'user'; translationKey?: string} | null | undefined): string {
    return value ? value.origin === 'app' && value.translationKey ? this.t(value.translationKey) : value.name : '';
  }
  public number(value: number | null | undefined, maximumFractionDigits = 3): string {
    return value == null ? '' : new Intl.NumberFormat(this.locale(), {maximumFractionDigits}).format(value);
  }
  public currency(value: number, currency = 'EUR'): string {
    return new Intl.NumberFormat(this.locale(), {style: 'currency', currency}).format(value);
  }
  public date(value: string): string {
    const date = new Date(`${value.slice(0, 10)}T12:00:00Z`);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(this.locale(), {timeZone: 'UTC'}).format(date);
  }
  public unit(unit: string | null | undefined, count = 2): string {
    const aliases: Record<string, string> = {'Stück': 'piece', Pck: 'package', Bund: 'bunch', Prise: 'pinch', pkg: 'package'};
    const code = aliases[unit ?? ''] ?? unit ?? '';
    return this.pack().messages[`units.${code}`] ? this.t(`units.${code}`, {count}) : code;
  }
  public quantity(amount: number | null | undefined, unit: string | null | undefined): string {
    return `${this.number(amount)} ${this.unit(unit, amount ?? 0)}`.trim();
  }
  public duration(minutes: number): string {
    return this.t('format.duration', {hours: Math.floor(minutes / 60), minutes: minutes % 60});
  }
  public compare(a: string, b: string): number {
    return new Intl.Collator(this.locale(), {sensitivity: 'base'}).compare(a, b) || a.localeCompare(b, this.locale());
  }
}
