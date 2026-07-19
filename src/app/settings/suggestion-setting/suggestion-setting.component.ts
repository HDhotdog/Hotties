import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SuggestionService } from '../../todo/suggestion/suggestion.service';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {Suggestion} from "../../todo/suggestion/suggestion.dto";

@Component({
  selector: 'app-suggestion-setting',
  templateUrl: './suggestion-setting.component.html',
  styleUrls: ['./suggestion-setting.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class SuggestionSettingComponent implements OnInit {

  private _suggestions: Suggestion[] = [];

  constructor(public suggestionService: SuggestionService, private router: Router) {
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
    // Explicit destination rather than Location.back() (see AddRecipeComponent for why).
    void this.router.navigate(['/tabs/settings']);
  }

  public removeSuggestion(idx: number) {
    this.suggestionService.deleteById(this._suggestions[idx].categoryId).subscribe();
  }

  get suggestions(): Suggestion[] {
    return this._suggestions;
  }
}
