import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TodoComponent } from './todo.component';

import { TodoRoutingModule } from './todo-routing.module';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Storage } from '@ionic/storage'
import { TodoService } from './todo.service';
import { SuggestionService } from '../suggestion/suggestion.service';
import { CategoryService } from '../category/category.service';


@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    TodoRoutingModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule
  ],
  declarations: [TodoComponent],
  providers: [
    Storage,
    TodoService,
    SuggestionService,
    CategoryService
  ]
})
export class TodoModule { }
