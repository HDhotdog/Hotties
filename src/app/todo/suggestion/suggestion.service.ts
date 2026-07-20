import { Injectable, inject } from '@angular/core';
import { SuggestionRepository } from './suggestion.repository';
import { map, Observable } from 'rxjs';
import { Suggestion } from './suggestion.dto';
import { toSuggestion, toRxSuggestion } from './suggestion.mapper';

@Injectable({
  providedIn: 'root',
})
export class SuggestionService {
  private suggestionRepository = inject(SuggestionRepository);

  public findByCategoryId(categoryId: string): Observable<Suggestion[]> {
    return this.suggestionRepository
      .findByCategoryId(categoryId)
      .pipe(map((docs) => docs.map(toSuggestion)));
  }

  public save(suggestion: Suggestion): Observable<Suggestion> {
    return this.suggestionRepository
      .save(toRxSuggestion(suggestion))
      .pipe(map(toSuggestion));
  }

  public saveAll(suggestions: Suggestion[]): Observable<Suggestion[]> {
    return this.suggestionRepository
      .saveAll(suggestions.map(toRxSuggestion))
      .pipe(map((docs) => docs.map(toSuggestion)));
  }

  public findAll(): Observable<Suggestion[]> {
    return this.suggestionRepository
      .findAll()
      .pipe(map((docs) => docs.map(toSuggestion)));
  }

  public clearSuggestions(): Observable<number> {
    return this.suggestionRepository.deleteAll();
  }

  public deleteById(id: string): Observable<boolean> {
    return this.suggestionRepository.deleteById(id);
  }
}
