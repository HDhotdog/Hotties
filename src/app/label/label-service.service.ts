import {inject, Injectable} from '@angular/core';
import {map, Observable, switchMap, take} from 'rxjs';
import {LabelRepository} from './label.repository';
import {LabelGroupRepository} from './label-group.repository';
import {Label, LabelGroup} from './models/label.dto';
import {toLabel, toLabelGroup, toRxLabel, toRxLabelGroup,} from './models/label.mapper';

@Injectable({
  providedIn: 'root',
})
export class LabelService {
  private labelRepository = inject(LabelRepository);
  private labelGroupRepository = inject(LabelGroupRepository);

  public getLabelsForRecipe(recipeId: string): Observable<Label[]> {
    return this.labelRepository
      .findByRecipeId(recipeId)
      .pipe(map((docs) => docs.map(toLabel).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))));
  }

  /** Template labels are the label definitions (recipeId "") shown for assignment in the settings/recipe form. */
  public getTemplateLabels(): Observable<Label[]> {
    return this.labelRepository
      .findByRecipeId('')
      .pipe(map((docs) => docs.map(toLabel).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))));
  }

  /** Replaces the labels assigned to a recipe with the given list. */
  public saveLabelsForRecipe(
    recipeId: string,
    labels: Label[]
  ): Observable<unknown> {
    // Cached recipe editors must not recreate assignments whose definitions were deleted.
    return this.getTemplateLabels().pipe(
      take(1),
      switchMap(templates => {
        const currentLabels = labels.filter(label => templates.some(template =>
          template.groupId === label.groupId && template.name === label.name
        ));
        return this.labelRepository.deleteByRecipeId(recipeId).pipe(
          switchMap(() => this.labelRepository.saveAll(currentLabels.map(toRxLabel)))
        );
      })
    );
  }

  public getDistinctLabelNames(): Observable<string[]> {
    return this.labelRepository.findDistinctNames();
  }

  public getDistinctLabels(): Observable<Label[]> {
    return this.labelRepository
      .findUniqueLabels()
      .pipe(map((docs) => docs.map(toLabel).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))));
  }

  public getAllLabels(): Observable<Label[]> {
    return this.labelRepository
      .findAll()
      .pipe(map((docs) => docs.map(toLabel).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))));
  }

  public getAllLabelGroups(): Observable<LabelGroup[]> {
    return this.labelGroupRepository
      .findAll()
      .pipe(map((docs) => docs.map(toLabelGroup).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))));
  }

  public saveLabel(label: Label): Observable<Label> {
    return this.labelRepository.save(toRxLabel(label)).pipe(map(toLabel));
  }

  public saveAllLabels(labels: Label[]): Observable<unknown> {
    return this.labelRepository.saveAll(labels.map(toRxLabel)).pipe(map(result => {
      if (!Array.isArray(result) || result.length !== labels.length) throw new Error('Could not save all labels');
      return result;
    }));
  }

  public saveAllGroups(labelGroups: LabelGroup[]): Observable<unknown> {
    return this.labelGroupRepository.saveAll(labelGroups.map(toRxLabelGroup)).pipe(map(result => {
      if (!Array.isArray(result) || result.length !== labelGroups.length) throw new Error('Could not save all label groups');
      return result;
    }));
  }

  public saveLabelGroup(labelGroup: LabelGroup): Observable<LabelGroup> {
    return this.labelGroupRepository
      .save(toRxLabelGroup(labelGroup))
      .pipe(map(toLabelGroup));
  }

  public deleteLabelById(labelId: string): Observable<boolean> {
    return this.labelRepository.deleteWithRecipeAssignmentsById(labelId);
  }

  public deleteLabelGroupById(labelGroupId: string): Observable<boolean> {
    return this.deleteAllLabelByGroupId(labelGroupId).pipe(
      switchMap(() => this.labelGroupRepository.deleteById(labelGroupId))
    );
  }

  private deleteAllLabelByGroupId(labelGroupId: string): Observable<number> {
    return this.labelRepository.deleteByLabelGroupId(labelGroupId);
  }
}
