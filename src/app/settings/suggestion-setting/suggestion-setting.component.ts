import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { SuggestionService } from '../../todo/suggestion/suggestion.service';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-suggestion-setting',
  templateUrl: './suggestion-setting.component.html',
  styleUrls: ['./suggestion-setting.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class SuggestionSettingComponent {

  constructor(public suggestionService: SuggestionService, private location: Location) {
    this.suggestionService = suggestionService;
  }

  async ionViewWillEnter() {
    this.suggestionService.loadSuggestions();
  }

  public navigateBack() {
    this.location.back()
  }

  public removeSuggestion(index: number) {
    this.suggestionService.suggestions.splice(index, 1);
    this.suggestionService.saveSuggestions();
  }

}
