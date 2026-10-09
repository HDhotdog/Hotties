import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FridgeComponent } from './fridge.component';
import { FridgeRoutingModule } from './fridge-routing.module';
import { AddFridgeItemComponent } from './add-fridge-item/add-fridge-item.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    FridgeRoutingModule,
    FridgeComponent,
    AddFridgeItemComponent
  ],
  declarations: []
})
export class FridgeModule {}
