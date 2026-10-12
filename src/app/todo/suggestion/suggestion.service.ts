import {inject, Injectable} from '@angular/core';
import {SuggestionRepository} from './suggestion.repository';
import {map, Observable} from 'rxjs';
import {Suggestion} from './suggestion.dto';
import {toRxSuggestion, toSuggestion} from './suggestion.mapper';

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
}
