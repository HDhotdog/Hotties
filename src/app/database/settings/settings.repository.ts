import {inject, Injectable} from '@angular/core';
import {Observable, switchMap} from 'rxjs';
import {AbstractRepository} from '../abstract-repository';
import {DatabaseService} from '../database';
import {RxSetting} from './rxSetting';

@Injectable({
  providedIn: 'root',
})
export class SettingsRepository extends AbstractRepository<RxSetting> {
  protected override database: DatabaseService;

  protected override collectionName: string = 'settings';

  constructor() {
    const database = inject(DatabaseService);

    super(database);

    this.database = database;
  }

  /** Live lookup by key; emits null if the setting hasn't been saved yet (unlike findById, this never errors). */
  public findByKey(key: string): Observable<RxSetting | null> {
    return this.getCollection().pipe(switchMap((col) => col.findOne(key).$));
  }
}
