import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { SuggestionService } from '../../todo/suggestion/suggestion.service';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {RxSuggestion} from "../../todo/suggestion/rxSuggestion";

@Component({
  selector: 'app-suggestion-setting',
  templateUrl: './suggestion-setting.component.html',
  styleUrls: ['./suggestion-setting.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class SuggestionSettingComponent implements OnInit {

  private _suggestions: RxSuggestion[] = [];

  constructor(public suggestionService: SuggestionService, private location: Location) {
    this.suggestionService = suggestionService;
  }

  ngOnInit(): void {
    this.suggestionService.findAll().subscribe(
      (suggestions) => {
        this._suggestions = suggestions;
      }
    );
  }

  async ionViewWillEnter() {
    this.suggestionService.findAll().subscribe();
  }

  public navigateBack() {
    this.location.back()
  }

  public removeSuggestion(idx: number) {
    this.suggestionService.deleteById(this._suggestions[idx].categoryId).subscribe();
  }

  get suggestions(): RxSuggestion[] {
    return this._suggestions;
  }
}
