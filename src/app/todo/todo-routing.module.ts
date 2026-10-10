import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {ScanProductComponent} from '../scanner/scan-product.component';
import {ShoppingPageComponent} from '../domain/shopping-page.component';

const routes: Routes = [
  {
    path: '',
    component: ShoppingPageComponent,
  },
  {path: 'scan', component: ScanProductComponent}
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TodoRoutingModule {
}
