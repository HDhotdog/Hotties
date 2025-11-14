import {Injectable} from '@angular/core';
import {Preferences} from '@capacitor/preferences';
import {SuggestionRepository} from "./suggestion.repository";
import {Observable} from "rxjs";
import {RxSuggestion} from "./rxSuggestion";

@Injectable({
  providedIn: 'root'
})
export class SuggestionService {

  constructor(private suggestionRepository: SuggestionRepository) {
  }

  public findByCategoryId(categoryId: string): Observable<RxSuggestion[]> {
    return this.suggestionRepository.findByCategoryId(categoryId);
  }

  public save(suggestion: RxSuggestion): Observable<RxSuggestion> {
    return this.suggestionRepository.save(suggestion);
  }

  public saveAll(suggestions: RxSuggestion[]): Observable<RxSuggestion[]> {
    return this.suggestionRepository.saveAll(suggestions);
  }

  public findAll(): Observable<RxSuggestion[]> {
    return this.suggestionRepository.findAll();
  }

  public clearSuggestions(): Observable<number> {
    return this.suggestionRepository.deleteAll();
  }

  public deleteById(id: string): Observable<boolean> {
    return this.suggestionRepository.deleteById(id);
  }
}
