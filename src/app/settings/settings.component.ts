import {Message} from '../i18n/language-pack';
import {LocalizationService} from '../i18n/localization.service';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
  MenuController,
} from '@ionic/angular';
import {ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, ViewChild} from '@angular/core';
import {ActivatedRoute, Router, RouterModule} from '@angular/router';

@Component({
  selector: 'app-settings',
  templateUrl: 'settings.component.html',
  styleUrls: ['settings.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterModule,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonSelect,
    IonSelectOption,
    IonTitle,
    IonToolbar,
  ],
})
export class SettingsComponent {
  public readonly i18n = inject(LocalizationService);
  @ViewChild(IonSelect) private languageSelect?: IonSelect;
  public languageError: Message = '';
  public changingLanguage = false;
  private readonly cdr = inject(ChangeDetectorRef);

  public async changeLanguage(language: string): Promise<void> {
    this.changingLanguage = true;
    this.languageError = '';
    try {await this.i18n.setLanguage(language);}
    catch (error) {
      this.languageError = this.i18n.error(error);
      if (this.languageSelect) this.languageSelect.value = this.i18n.language();
    }
    finally {this.changingLanguage = false; this.cdr.markForCheck();}
  }
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private menuController = inject(MenuController);

  public openMainMenu(): void {
    this.menuController.open('main-menu');
  }

  public openCategorySetting() {
    this.router.navigate(['category'], {relativeTo: this.route});
  }

  public openLabelSetting() {
    this.router.navigate(['label'], {relativeTo: this.route});
  }

  public openInfoSetting() {
    this.router.navigate(['info'], {relativeTo: this.route});
  }

  public openAiModels(): void {
    void this.router.navigate(['ai-models'], {relativeTo: this.route});
  }
}
