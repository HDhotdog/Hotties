import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TodoComponent } from './todo.component';
import { ScanProductComponent } from '../scanner/scan-product.component';

const routes: Routes = [
  {
    path: '',
    component: TodoComponent,
  },
  { path: 'scan', component: ScanProductComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TodoRoutingModule {}
