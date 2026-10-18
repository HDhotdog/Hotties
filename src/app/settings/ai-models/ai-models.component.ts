import {Message, message} from '../../i18n/language-pack';
import {LocalizationService} from '../../i18n/localization.service';
import {ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnDestroy, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {
  AlertController, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonTitle, IonToggle, IonToolbar
} from '@ionic/angular';
import {AiModelService, AiModelStatus} from '../../domain/ai-model.service';
import {CategorySuggestionService} from '../../domain/category-suggestion.service';

@Component({
  selector: 'app-ai-models',
  standalone: true,
  imports: [IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonTitle, IonToggle, IonToolbar],
  templateUrl: './ai-models.component.html',
  styleUrls: ['./ai-models.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AiModelsComponent implements OnInit, OnDestroy {
  public readonly i18n = inject(LocalizationService);
  private readonly model = inject(AiModelService);
  private readonly suggestions = inject(CategorySuggestionService);
  private readonly router = inject(Router);
  private readonly alerts = inject(AlertController);
  private readonly cdr = inject(ChangeDetectorRef);
  private poller: ReturnType<typeof setInterval> | null = null;
  private refreshing = false;
  public readonly supported = this.model.supported;
  public enabled = true;
  public busy = false;
  public error: Message = '';
  public status: AiModelStatus = {state: 'missing', downloadedBytes: 0, totalBytes: 0};

  public ngOnInit(): void {
    void this.load();
    this.poller = setInterval(() => {
      if (this.status.state === 'downloading' || this.status.state === 'paused') void this.refresh();
    }, 800);
  }

  public ngOnDestroy(): void {
    if (this.poller) clearInterval(this.poller);
  }

  public ionViewWillEnter(): void {
    void this.refresh();
  }

  private async load(): Promise<void> {
    try {
      this.enabled = await this.model.enabled();
      await this.refresh();
    } catch (error) {
      this.error = this.i18n.error(error);
      this.cdr.markForCheck();
    }
  }

  public async refresh(): Promise<void> {
    if (this.refreshing) return;
    this.refreshing = true;
    try {
      this.status = await this.model.status();
      this.error = this.status.error ? this.i18n.error({code: this.status.error}) : '';
      this.cdr.markForCheck();
    } catch (error) {
      this.error = this.i18n.error(error);
      this.cdr.markForCheck();
    } finally {
      this.refreshing = false;
    }
  }

  public async toggleEnabled(enabled: boolean): Promise<void> {
    if (!enabled) this.suggestions.stop();
    try {
      await this.model.setEnabled(enabled);
      this.enabled = enabled;
      this.error = '';
    } catch (error) {
      this.error = this.i18n.error(error);
    }
    this.cdr.markForCheck();
  }

  public async download(): Promise<void> {
    if (this.busy || !this.supported) return;
    this.busy = true;
    this.error = '';
    this.cdr.markForCheck();
    try {
      const connection = await this.model.connection();
      let allowCellular = false;
      if (connection === 'cellular') {
        const alert = await this.alerts.create({
          header: this.i18n.t('ui.useCellularData'),
          message: this.i18n.t('ui.theAiModelIsAbout157MbCellularChargesMayApplyThisPermissionIsForThisDownloadOnly'),
          buttons: [{text: this.i18n.t('ui.cancel'), role: 'cancel'}, {text: this.i18n.t('ui.download'), role: 'download'}]
        });
        await alert.present();
        allowCellular = (await alert.onDidDismiss()).role === 'download';
        if (!allowCellular) return;
      } else if (connection !== 'wifi') {
        this.error = 'ui.connectToWiFiBeforeDownloadingTheAiModel';
        return;
      }
      this.status = await this.model.start(allowCellular);
    } catch (error) {
      this.error = this.i18n.error(error);
    } finally {
      this.busy = false;
      this.cdr.markForCheck();
    }
  }

  public async delete(): Promise<void> {
    if (this.busy || !this.supported) return;
    const alert = await this.alerts.create({
      header: this.i18n.t('ui.deleteAiModel'),
      message: this.i18n.t('ui.aiCategorySuggestionsWillStopYouCanDownloadTheModelAgainLater'),
      buttons: [{text: this.i18n.t('ui.cancel'), role: 'cancel'}, {text: this.i18n.t('ui.deleteModel'), role: 'delete'}]
    });
    await alert.present();
    if ((await alert.onDidDismiss()).role !== 'delete') return;
    this.busy = true;
    this.suggestions.stop();
    try {
      this.status = await this.model.delete();
      this.error = '';
    } catch (error) {
      this.error = this.i18n.error(error);
    } finally {
      this.busy = false;
      this.cdr.markForCheck();
    }
  }

  public progressPercent(): number {
    return this.status.totalBytes ? Math.min(100, Math.floor(this.status.downloadedBytes / this.status.totalBytes * 100)) : 0;
  }

  public formatBytes(bytes: number): string {
    return `${this.i18n.number(bytes / 1_000_000, 1)} MB`;
  }

  public navigateBack(): void {
    void this.router.navigate(['/tabs/settings']);
  }
}
