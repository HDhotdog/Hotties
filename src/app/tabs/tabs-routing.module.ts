import {inject, NgModule} from '@angular/core';
import {Router, RouterModule, Routes} from '@angular/router';
import {TabsPage} from './tabs.page';

export const tabsRoutes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    children: [
      {
        path: 'shopping',
        loadChildren: () => import('../todo/todo.module').then(m => m.TodoModule)
      },
      {path: 'todo/scan', redirectTo: ({queryParams}) =>
        inject(Router).createUrlTree(['/tabs/shopping/scan'], {queryParams}), pathMatch: 'full'},
      {path: 'todo', redirectTo: '/tabs/shopping', pathMatch: 'full'},
      {
        path: 'recipe',
        loadChildren: () => import('../recipe/recipe.module').then(m => m.RecipeModule)
      },
      {
        path: 'fridge',
        loadChildren: () => import('../fridge/fridge.module').then(m => m.FridgeModule)
      },
      {
        path: 'items',
        loadChildren: () => import('../item/item.module').then(m => m.ItemModule)
      },
      {
        path: 'settings',
        loadChildren: () => import('../settings/settings.module').then(m => m.SettingsComponentModule)
      },
      {
        path: '',
        redirectTo: '/tabs/shopping',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '',
    redirectTo: '/tabs/shopping',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forChild(tabsRoutes)],
})
export class TabsPageRoutingModule {
}
