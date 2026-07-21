import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FridgeComponent } from './fridge.component';
import { AddFridgeItemComponent } from './add-fridge-item/add-fridge-item.component';

const routes: Routes = [
  {
    path: '',
    component: FridgeComponent,
  },
  {
    path: 'new',
    component: AddFridgeItemComponent
  },
  {
    path: 'edit/:id',
    component: AddFridgeItemComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FridgeRoutingModule {}
