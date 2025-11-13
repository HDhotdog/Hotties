import {Injectable} from '@angular/core';
import {Preferences} from '@capacitor/preferences';
import {DatabaseService} from "./database/database";
import {RxCategory} from "./category/category";
import {CategoryRepository} from "./category/category.repository";

@Injectable({
  providedIn: 'root'
})
export class AppService {

  private INIT_STORAGE: string = 'initiated';
  private HEIGHT_STORAGE: string = 'first-height';
  public firstTime: boolean = false;

  constructor(private repo: CategoryRepository) {
  }

  public async saveInitialValues() {
    const cat = {
      id: "1",
      name: "Edeka"
    } as RxCategory;
    const doc = await this.repo.saveOrUpdateCategory(cat)
    console.log(doc.get("name"))
    Preferences.set({key: this.INIT_STORAGE, value: JSON.stringify(this.firstTime)});
  }

  public async loadInitialValues() {
    const {value} = await Preferences.get({key: this.INIT_STORAGE})
    this.firstTime = (value ? JSON.parse(value) : true);
  }

  public async saveHeight(height: number) {
    Preferences.set({key: this.HEIGHT_STORAGE, value: JSON.stringify(height)});
  }

  public async loadHeight() {
    const {value} = await Preferences.get({key: this.HEIGHT_STORAGE})
    return (value ? JSON.parse(value) : 0) as number;
  }

}
