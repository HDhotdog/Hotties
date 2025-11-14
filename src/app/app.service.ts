import {Injectable} from '@angular/core';
import {Preferences} from '@capacitor/preferences';
import {RxCategory} from "./category/category";
import {CategoryService} from "./category/category.service";
import {v4 as UUIDv4} from 'uuid';
import {Observable} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class AppService {

  private INIT_STORAGE: string = 'initiated';
  private HEIGHT_STORAGE: string = 'first-height';
  public firstTime: boolean = false;

  constructor(private categoryService: CategoryService) {
  }

  public saveInitialValues(): Observable<RxCategory> {
    const edeka = {
      id: UUIDv4(),
      name: "Edeka"
    } as RxCategory;

    localStorage.setItem("selectedCategoryId", edeka.id);
    return this.categoryService.save(edeka)
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
