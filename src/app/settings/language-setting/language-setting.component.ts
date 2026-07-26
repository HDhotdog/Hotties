import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import {
  LanguageOption,
  LanguageService,
} from '../language/language.service';

@Component({
  selector: 'app-language-setting',
  templateUrl: './language-setting.component.html',
  styleUrls: ['./language-setting.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [IonicModule, TranslateModule],
})
export class LanguageSettingComponent {
  private router = inject(Router);
  private languageService = inject(LanguageService);

  public readonly languages: LanguageOption[] = this.languageService.supportedLanguages;
  public selectedLanguage: string = this.languageService.getCurrentLanguage();

  public async selectLanguage(code: string): Promise<void> {
    this.selectedLanguage = code;
    await this.languageService.setLanguage(code);
  }

  public navigateBack() {
    // Explicit destination rather than Location.back() (see AddRecipeComponent for why).
    void this.router.navigate(['/tabs/settings']);
  }
}
