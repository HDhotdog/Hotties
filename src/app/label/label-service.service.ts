import {Injectable} from '@angular/core';
import {Observable, switchMap} from 'rxjs';
import {LabelRepository} from 'src/app/label/label.repository';
import {RxLabel, RxLabelGroup} from 'src/app/label/models/label';
import {LabelGroupRepository} from "./label-group.repository";

@Injectable({
  providedIn: 'root'
})
export class LabelService {

  constructor(private labelRepository: LabelRepository, private labelGroupRepository: LabelGroupRepository) {
  }

  public getLabelsForRecipe(recipeId: string): Observable<RxLabel[]> {
    return this.labelRepository.findByRecipeId(recipeId);
  }

  /** Template labels are the label definitions (recipeId "") shown for assignment in the settings/recipe form. */
  public getTemplateLabels(): Observable<RxLabel[]> {
    return this.labelRepository.findByRecipeId('');
  }

  /** Replaces the labels assigned to a recipe with the given list. */
  public saveLabelsForRecipe(recipeId: string, labels: RxLabel[]): Observable<unknown> {
    return this.labelRepository.deleteByRecipeId(recipeId).pipe(
      switchMap(() => this.labelRepository.saveAll(labels))
    );
  }

  public getDistinctLabelNames(): Observable<string[]> {
    return this.labelRepository.findDistinctNames();
  }

  public getDistinctLabels(): Observable<RxLabel[]> {
    return this.labelRepository.findUniqueLabels();
  }

  public getAllLabels(): Observable<RxLabel[]> {
    return this.labelRepository.findAll();
  }

  public getAllLabelGroups(): Observable<RxLabelGroup[]> {
    return this.labelGroupRepository.findAll();
  }

  public saveLabel(label: RxLabel): Observable<RxLabel> {
    return this.labelRepository.save(label);
  }

  public saveAllLabels(labels: RxLabel[]) {
    return this.labelRepository.saveAll(labels);
  }

  public saveAllGroups(labelGroups: RxLabelGroup[]) {
    return this.labelGroupRepository.saveAll(labelGroups);
  }

  public saveLabelGroup(labelGroup: RxLabelGroup): Observable<RxLabelGroup> {
    return this.labelGroupRepository.save(labelGroup);
  }

  public deleteLabelById(labelId: string): Observable<boolean> {
    return this.labelRepository.deleteById(labelId);
  }

  public deleteLabelGroupById(labelGroupId: string): Observable<boolean> {
    return this.deleteAllLabelByGroupId(labelGroupId).pipe(() => {
      return this.labelGroupRepository.deleteById(labelGroupId);
    });
  }

  private deleteAllLabelByGroupId(labelGroupId: string): Observable<number> {
    return this.labelRepository.deleteByLabelGroupId(labelGroupId);
  }

  // public saveLabels(labelGroups: RxLabelGroup[]) {
  //   this.labelRepository.saveAll(labelGroups);
  // }
  //
  // public findAll(): Observable<RxLabel[]> {
  //   return this.labelRepository.findAll();
  // }
  //
  // public clearLabels() {
  //   this.labelRepository.deleteAll();
  // }
}
