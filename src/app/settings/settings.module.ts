import { IonicModule } from '@ionic/angular';
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsComponent } from './settings.component';

import { SettingsRoutingModule } from './settings-routing.module';
import { CacheSettingComponent } from './cache-setting/cache-setting.component';
import { SuggestionSettingComponent } from './suggestion-setting/suggestion-setting.component';
import { CategorySettingComponent } from './category-setting/category-setting.component';
import { AddCategorySettingComponent } from './category-setting/add-category-setting/add-category-setting.component';
import { LabelSettingComponent } from './label-setting/label-setting.component';
import { LanguageSettingComponent } from './language-setting/language-setting.component';

@NgModule({
  imports: [
    IonicModule.forRoot(),
    CommonModule,
    FormsModule,
    SettingsRoutingModule,
    SettingsComponent,
    CacheSettingComponent,
    SuggestionSettingComponent,
    CategorySettingComponent,
    AddCategorySettingComponent,
    LabelSettingComponent,
    LanguageSettingComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class SettingsComponentModule { }
