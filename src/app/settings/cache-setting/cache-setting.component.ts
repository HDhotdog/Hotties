import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonList,
  IonTitle,
  IonToast,
  IonToolbar,
} from '@ionic/angular';
import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {Router} from '@angular/router';
import {CategoryService} from '../../category/category.service';

import {v4 as uuidv4} from 'uuid';
import {switchMap} from 'rxjs';
import {Category} from '../../category/category.dto';

@Component({
  selector: 'app-cache-setting',
  templateUrl: './cache-setting.component.html',
  styleUrls: ['./cache-setting.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonList,
    IonTitle,
    IonToast,
    IonToolbar,
  ],
})
export class CacheSettingComponent {
  private categoryService = inject(CategoryService);
  private router = inject(Router);

  public clearCategoryCache() {
    const category: Category = {
      id: uuidv4(),
      name: 'Edeka',
      saveSuggestions: true,
    };

    this.categoryService
      .deleteAllCategories()
      .pipe(switchMap(() => this.categoryService.initCategories([category])))
      .subscribe();
  }

  public navigateBack() {
    // Explicit destination rather than Location.back() (see AddRecipeComponent for why).
    void this.router.navigate(['/tabs/settings']);
  }
}
