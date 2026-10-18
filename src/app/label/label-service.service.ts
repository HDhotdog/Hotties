import {AppError} from '../i18n/language-pack';
import {inject, Injectable} from '@angular/core';
import {map, Observable, of, switchMap, take} from 'rxjs';
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
      switchMap(templates => this.getLabelsForRecipe(recipeId).pipe(take(1), switchMap(existing => {
        // A cached editor may still hold names from before a definition was renamed.
        // Resolve persisted assignment IDs first, then newly selected group/name pairs.
        const currentLabels = labels.flatMap(label => {
          const persisted = existing.find(current => current.id === label.id);
          const source = persisted ?? label;
          const template = templates.find(candidate => candidate.groupId === source.groupId && candidate.name === source.name);
          if (!template) return [];
          const saved = {...label, name: template.name};
          delete saved.origin;
          delete saved.translationKey;
          if (template.origin) saved.origin = template.origin;
          if (template.translationKey) saved.translationKey = template.translationKey;
          return [saved];
        });
        return this.labelRepository.deleteByRecipeId(recipeId).pipe(
          switchMap(() => this.labelRepository.saveAll(currentLabels.map(toRxLabel)))
        );
      })))
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
    return this.labelRepository.findAll().pipe(take(1), switchMap(labels => {
      const original = labels.find(existing => existing.id === label.id);
      const renamed = original && (original.name !== label.name || (!!original.translationKey && !label.translationKey));
      const saved = toRxLabel({...label, origin: original?.origin ?? label.origin ?? (original ? undefined : 'user')});
      if (renamed) delete saved.translationKey;
      const copies = renamed && original.recipeId === '' ? labels.filter(existing =>
        existing.recipeId !== '' && existing.groupId === original.groupId && existing.name === original.name
      ).map(existing => {const copy = {...toRxLabel(toLabel(existing)), name: label.name}; delete copy.translationKey; return copy;}) : [];
      const updateCopies = copies.length ? this.saveAllLabels(copies) : of([]);
      return updateCopies.pipe(switchMap(() => this.labelRepository.save(saved)), map(toLabel));
    }));
  }

  public saveAllLabels(labels: Label[]): Observable<unknown> {
    return this.labelRepository.saveAll(labels.map(toRxLabel)).pipe(map(result => {
      if (!Array.isArray(result) || result.length !== labels.length) throw new AppError('ui.couldNotSaveAllLabels', "Could not save all labels");
      return result;
    }));
  }

  public saveAllGroups(labelGroups: LabelGroup[]): Observable<unknown> {
    return this.labelGroupRepository.saveAll(labelGroups.map(toRxLabelGroup)).pipe(map(result => {
      if (!Array.isArray(result) || result.length !== labelGroups.length) throw new AppError('ui.couldNotSaveAllLabelGroups', "Could not save all label groups");
      return result;
    }));
  }

  public saveLabelGroup(labelGroup: LabelGroup): Observable<LabelGroup> {
    return this.labelGroupRepository.findAll().pipe(take(1), switchMap(groups => {
      const original = groups.find(group => group.id === labelGroup.id);
      const saved = toRxLabelGroup({...labelGroup, origin: original?.origin ?? labelGroup.origin ?? (original ? undefined : 'user')});
      if (original && original.name !== labelGroup.name) delete saved.translationKey;
      return this.labelGroupRepository.save(saved).pipe(map(toLabelGroup));
    }));
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
