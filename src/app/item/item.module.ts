import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ItemComponent } from './item.component';
import { ItemRoutingModule } from './item-routing.module';
import { AddItemComponent } from './add-item/add-item.component';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    ItemRoutingModule,
    ItemComponent,
    AddItemComponent
  ],
  declarations: []
})
export class ItemModule {}
