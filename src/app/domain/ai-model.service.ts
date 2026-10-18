import {LocalizationService} from '../i18n/localization.service';
import {inject, Injectable} from '@angular/core';
import {Capacitor, registerPlugin} from '@capacitor/core';
import {firstValueFrom, Subject, take} from 'rxjs';
import {SettingsRepository} from '../database/settings/settings.repository';

export type AiModelState = 'missing' | 'downloading' | 'paused' | 'failed' | 'ready';

export interface AiModelStatus {
  state: AiModelState;
  downloadedBytes: number;
  totalBytes: number;
  directory?: string;
  error?: string;
}

interface NotificationCopy {notificationTitle: string; notificationDescription: string}

interface AiModelPlugin {
  connection(): Promise<{type: 'wifi' | 'cellular' | 'none' | 'unknown'}>;
  status(options: NotificationCopy): Promise<AiModelStatus>;
  localize(options: NotificationCopy): Promise<void>;
  start(options: {allowCellular: boolean; notificationTitle: string; notificationDescription: string}): Promise<AiModelStatus>;
  delete(): Promise<AiModelStatus>;
}

const nativeModel = registerPlugin<AiModelPlugin>('AiModel');
const AI_ENABLED_KEY = 'aiSuggestionsEnabled';

@Injectable({providedIn: 'root'})
export class AiModelService {
  private readonly i18n = inject(LocalizationService);
  private readonly settings = inject(SettingsRepository);
  private enabledPromise: Promise<boolean> | null = null;
  public readonly enabledChanged = new Subject<boolean>();

  constructor() {
    this.i18n.languageChanged.subscribe(() => {
      if (this.supported) void nativeModel.localize(this.notificationCopy())
        .catch(error => console.error('Could not update native notification language.', error));
    });
  }

  private notificationCopy(): NotificationCopy {
    return {notificationTitle: this.i18n.t('notification.modelTitle'),
      notificationDescription: this.i18n.t('notification.modelDescription')};
  }

  public get supported(): boolean {
    return Capacitor.getPlatform() === 'android';
  }

  public enabled(): Promise<boolean> {
    if (!this.enabledPromise) {
      this.enabledPromise = firstValueFrom(this.settings.findByKey(AI_ENABLED_KEY).pipe(take(1)))
        .then(setting => setting?.value !== 'false')
        .catch(error => {
          this.enabledPromise = null;
          throw error;
        });
    }
    return this.enabledPromise;
  }

  public async setEnabled(enabled: boolean): Promise<void> {
    const previous = this.enabledPromise ?? this.enabled();
    this.enabledPromise = Promise.resolve(enabled);
    this.enabledChanged.next(enabled);
    try {
      await firstValueFrom(this.settings.save({key: AI_ENABLED_KEY, value: String(enabled)}));
    } catch (error) {
      this.enabledPromise = previous;
      this.enabledChanged.next(await previous);
      throw error;
    }
  }

  public async status(): Promise<AiModelStatus> {
    if (!this.supported) return {state: 'missing', downloadedBytes: 0, totalBytes: 0};
    return nativeModel.status(this.notificationCopy());
  }

  public async connection(): Promise<'wifi' | 'cellular' | 'none' | 'unknown'> {
    if (!this.supported) return 'unknown';
    return (await nativeModel.connection()).type;
  }

  public async start(allowCellular: boolean): Promise<AiModelStatus> {
    return nativeModel.start({allowCellular, ...this.notificationCopy()});
  }

  public async delete(): Promise<AiModelStatus> {
    return nativeModel.delete();
  }

  public async installedBaseUrl(): Promise<string | null> {
    const status = await this.status();
    if (status.state !== 'ready' || !status.directory) return null;
    return Capacitor.convertFileSrc(status.directory).replace(/\/$/, '');
  }
}
