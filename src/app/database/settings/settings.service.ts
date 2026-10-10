import {inject, Injectable} from '@angular/core';
import {map, Observable} from 'rxjs';
import {SettingsRepository} from './settings.repository';

const SELECTED_CATEGORY_ID_KEY = 'selectedCategoryId';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private settingsRepository = inject(SettingsRepository);

  public getSelectedCategoryId(): Observable<string | null> {
    return this.settingsRepository
      .findByKey(SELECTED_CATEGORY_ID_KEY)
      .pipe(map((setting) => setting?.value ?? null));
  }

  public setSelectedCategoryId(categoryId: string): Observable<unknown> {
    return this.settingsRepository.save({
      key: SELECTED_CATEGORY_ID_KEY,
      value: categoryId,
    });
  }
}
