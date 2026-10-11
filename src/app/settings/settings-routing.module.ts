import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {CacheSettingComponent} from './cache-setting/cache-setting.component';
import {AddCategorySettingComponent} from './category-setting/add-category-setting/add-category-setting.component';
import {CategorySettingComponent} from './category-setting/category-setting.component';
import {SettingsComponent} from './settings.component';
import {LabelSettingComponent} from './label-setting/label-setting.component';
import {InfoComponent} from "./info/info.component";
import {AiModelsComponent} from './ai-models/ai-models.component';

const routes: Routes = [
  {
    path: '',
    component: SettingsComponent,
  },
  {
    path: 'label',
    component: LabelSettingComponent
  },
  {
    path: 'cache',
    component: CacheSettingComponent,
  },
  {
    path: 'category',
    component: CategorySettingComponent,
  },
  {
    path: 'info',
    component: InfoComponent
  },
  {
    path: 'ai-models',
    component: AiModelsComponent
  },
  {
    path: 'category/new',
    component: AddCategorySettingComponent,
  },
  {
    path: 'category/new/:id',
    component: AddCategorySettingComponent,
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SettingsRoutingModule {
}
