import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {TodoRoutingModule} from './todo-routing.module';


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    TodoRoutingModule
  ],
})
export class TodoModule {
}
