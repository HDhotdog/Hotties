import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsComponent } from './settings.component';

import { SettingsRoutingModule } from './settings-routing.module';
import { CacheSettingComponent } from './cache-setting/cache-setting.component';
import { SuggestionSettingComponent } from './suggestion-setting/suggestion-setting.component';
import { CategorySettingComponent } from './category-setting/category-setting.component';
import { AddCategorySettingComponent } from './category-setting/add-category-setting/add-category-setting.component';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    SettingsRoutingModule
  ],
  declarations: [SettingsComponent, CacheSettingComponent, SuggestionSettingComponent,
    CategorySettingComponent, AddCategorySettingComponent]
})
export class SettingsComponentModule { }
