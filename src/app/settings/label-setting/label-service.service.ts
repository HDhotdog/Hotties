import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { LabelGroup } from 'src/app/label/models/label.interface';

@Injectable({
  providedIn: 'root'
})
export class LabelService {

  private LABEL_STORAGE: string = 'labels';
  public labelGroups: LabelGroup[] = [];

  constructor() {
  }

  public async saveLabels() {
    Preferences.set({ key: this.LABEL_STORAGE, value: JSON.stringify(this.labelGroups) });
  }

  public async loadLabels() {
    const { value } = await Preferences.get({ key: this.LABEL_STORAGE })
    this.labelGroups = (value ? JSON.parse(value) : []) as LabelGroup[];
  }

  public async clearLabels() {
    this.labelGroups.length = 0;
    Preferences.remove({ key: this.LABEL_STORAGE })
  }
}
