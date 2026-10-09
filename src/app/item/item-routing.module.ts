import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {CatalogPageComponent} from '../domain/catalog-page.component';

const routes: Routes = [
  {
    path: '',
    component: CatalogPageComponent,
  },
  {
    path: 'new',
    component: CatalogPageComponent
  },
  {
    path: 'edit/:id',
    component: CatalogPageComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ItemRoutingModule {}
