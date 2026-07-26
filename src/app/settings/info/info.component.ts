import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {Router} from '@angular/router';
import {IonicModule} from '@ionic/angular';
import {COMMIT_HASH, VERSION} from '../../../environments/version';
import {TranslateModule} from '@ngx-translate/core';

@Component({
  selector: 'app-info-setting',
  templateUrl: './info.component.html',
  styleUrls: ['./info.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [IonicModule, TranslateModule],
})
export class InfoComponent {
  private router = inject(Router);

  public readonly version = VERSION;
  public readonly commitHash = COMMIT_HASH;

  public navigateBack() {
    // Explicit destination rather than Location.back() (see AddRecipeComponent for why).
    void this.router.navigate(['/tabs/settings']);
  }
}
