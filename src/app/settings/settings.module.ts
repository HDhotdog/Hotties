import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsComponent } from './settings.component';
import { ExploreContainerComponentModule } from '../explore-container/explore-container.module';

import { SettingsRoutingModule } from './settings-routing.module';
import { CacheSettingComponent } from './cache-setting/cache-setting.component';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    ExploreContainerComponentModule,
    SettingsRoutingModule
  ],
  declarations: [SettingsComponent, CacheSettingComponent]
})
export class SettingsComponentModule { }
