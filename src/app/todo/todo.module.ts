import { IonicModule } from '@ionic/angular';
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TodoComponent } from './todo.component';

import { TodoRoutingModule } from './todo-routing.module';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Storage } from '@ionic/storage'
import { TodoService } from './todo.service';
import { SuggestionService } from './suggestion/suggestion.service';
import { CategoryService } from '../category/category.service';


@NgModule({
  imports: [
    IonicModule.forRoot(),
    CommonModule,
    FormsModule,
    TodoRoutingModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    TodoComponent
  ],
  providers: [
    Storage,
    TodoService,
    SuggestionService,
    CategoryService
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class TodoModule { }
