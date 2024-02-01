import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RecipeComponent } from './recipe.component';
import { RecipeRoutingModule } from './recipe-routing.module';
import { AddRecipeComponent } from './add-recipe/add-recipe.component';
import { RecipeDisplayComponent } from './recipe-display/recipe-display.component';
import { SettingsComponentModule } from '../settings/settings.module';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    RecipeRoutingModule,
    SettingsComponentModule
  ],
  declarations: [RecipeComponent, AddRecipeComponent, RecipeDisplayComponent]
})
export class RecipeModule {}
