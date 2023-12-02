import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsComponent } from './settings.component';
import { ExploreContainerComponentModule } from '../explore-container/explore-container.module';

import { SettingsRoutingModule } from './settings-routing.module';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    ExploreContainerComponentModule,
    SettingsRoutingModule
  ],
  declarations: [SettingsComponent]
})
export class SettingsComponentModule {}
