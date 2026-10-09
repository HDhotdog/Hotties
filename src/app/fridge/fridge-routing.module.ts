import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {StockPageComponent} from '../domain/stock-page.component';

const routes: Routes = [
  {
    path: '',
    component: StockPageComponent,
  },
  {
    path: 'new',
    component: StockPageComponent
  },
  {
    path: 'edit/:id',
    component: StockPageComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FridgeRoutingModule {}
