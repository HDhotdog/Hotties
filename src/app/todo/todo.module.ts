import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TodoComponent } from './todo.component';
import { ExploreContainerComponentModule } from '../explore-container/explore-container.module';

import { TodoRoutingModule } from './todo-routing.module';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Storage } from '@ionic/storage'
import { TodoService } from './todo.service';
import { SuggestionService } from '../suggestion/suggestion.service';


@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    ExploreContainerComponentModule,
    TodoRoutingModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule
  ],
  declarations: [TodoComponent],
  providers: [
    Storage,
    TodoService,
    SuggestionService
  ]
})
export class TodoModule { }
