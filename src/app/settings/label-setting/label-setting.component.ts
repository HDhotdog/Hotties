import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonReorder,
  IonReorderGroup,
  ReorderEndEventDetail,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import {ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, OnInit} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {FormsModule} from '@angular/forms';
import {Router} from '@angular/router';
import {combineLatest, finalize} from 'rxjs';
import {v4 as uuidv4} from 'uuid';
import {Label, LabelGroup} from '../../label/models/label.dto';
import {LabelService} from '../../label/label-service.service';
import {labelsForGroup as getLabelsForGroup} from '../../recipe/recipe-filter';

@Component({
  selector: 'app-label-setting-component',
  templateUrl: './label-setting.component.html',
  styleUrls: ['./label-setting.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonReorder, IonReorderGroup, IonTitle, IonToolbar],
})
export class LabelSettingComponent implements OnInit {
  private router = inject(Router);
  private labelService = inject(LabelService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);
  private labels: Label[] = [];

  labelGroups: LabelGroup[] = [];
  labelDrafts: Record<string, string> = {};
  newGroupName = '';
  editingGroup: LabelGroup | null = null;
  editingLabel: {group: LabelGroup; label: Label} | null = null;
  editName = '';
  savingGroup = false;
  savingLabels = new Set<string>();
  savingEdit = false;
  error = '';
  reorderingGroups = false;
  reorderingLabels = false;

  ngOnInit() {
    combineLatest([
      this.labelService.getAllLabelGroups(),
      this.labelService.getAllLabels(),
    ]).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(([labelGroups, labels]) => {
      if (!this.reorderingGroups) this.labelGroups = labelGroups;
      if (!this.reorderingLabels) this.labels = labels;
      this.cdr.markForCheck();
    });
  }

  labelDraft(groupId: string): string {
    return this.labelDrafts[groupId] ?? '';
  }

  addLabelGroup() {
    const name = this.newGroupName.trim();
    if (!name || this.savingGroup || this.reorderingGroups || this.reorderingLabels) return;
    const draft = this.newGroupName;
    this.savingGroup = true;
    this.error = '';
    this.labelService.saveLabelGroup({id: uuidv4(), name, sortOrder: this.nextOrder(this.labelGroups)}).pipe(finalize(() => {
      this.savingGroup = false;
      this.cdr.markForCheck();
    })).subscribe({
      next: () => {
        if (this.newGroupName === draft) this.newGroupName = '';
      },
      error: () => this.error = 'Could not add the group. Please try again.',
    });
  }

  addLabel(group: LabelGroup) {
    const draft = this.labelDraft(group.id);
    const name = draft.trim();
    if (!name || this.savingLabels.has(group.id) || this.reorderingGroups || this.reorderingLabels) return;
    this.savingLabels.add(group.id);
    this.error = '';
    this.labelService.saveLabel({id: uuidv4(), groupId: group.id, recipeId: '', name, sortOrder: this.nextOrder(this.labelsForGroup(group.id))})
      .pipe(finalize(() => {
        this.savingLabels.delete(group.id);
        this.cdr.markForCheck();
      })).subscribe({
        next: () => {
          if (this.labelDraft(group.id) === draft) this.labelDrafts[group.id] = '';
        },
        error: () => this.error = 'Could not add the label. Please try again.',
      });
  }

  startEditingGroup(group: LabelGroup) {
    if (this.savingEdit || this.reorderingGroups || this.reorderingLabels) return;
    this.cancelEdit();
    this.editingGroup = group;
    this.editName = group.name;
  }

  startEditingLabel(group: LabelGroup, label: Label) {
    if (this.savingEdit || this.reorderingGroups || this.reorderingLabels) return;
    this.cancelEdit();
    this.editingLabel = {group, label};
    this.editName = label.name;
  }

  saveEdit() {
    const name = this.editName.trim();
    if (!name || this.savingEdit) return;
    const target = this.editingGroup ?? this.editingLabel?.label;
    if (!target) return;
    if (name === target.name) {
      this.cancelEdit();
      return;
    }
    const save = this.editingGroup
      ? this.labelService.saveLabelGroup({...this.editingGroup, name})
      : this.labelService.saveLabel({...this.editingLabel!.label, name});
    this.savingEdit = true;
    this.error = '';
    save.pipe(finalize(() => {
      this.savingEdit = false;
      this.cdr.markForCheck();
    })).subscribe({
      next: () => this.cancelEdit(),
      error: () => this.error = 'Could not save the name. Please try again.',
    });
  }

  cancelEdit() {
    this.editingGroup = null;
    this.editingLabel = null;
    this.editName = '';
  }

  removeLabel(label: Label) {
    this.labelService.deleteLabelById(label.id).subscribe();
  }

  removeLabelGroup(group: LabelGroup) {
    this.labelService.deleteLabelGroupById(group.id).subscribe();
  }


  get reorderDisabled(): boolean {
    return this.reorderingGroups || this.reorderingLabels || !!this.editingGroup || !!this.editingLabel ||
      this.savingEdit || this.savingGroup || this.savingLabels.size > 0;
  }

  private nextOrder(items: {sortOrder?: number}[]): number {
    return Math.max(-1, ...items.map(item => item.sortOrder ?? 0)) + 1;
  }

  private reordered<T extends {sortOrder?: number}>(items: T[], from: number, to: number): T[] {
    const ordered = [...items];
    const [item] = ordered.splice(from, 1);
    ordered.splice(to, 0, item);
    return ordered.map((entry, sortOrder) => ({...entry, sortOrder}));
  }

  reorderGroups(event: CustomEvent<ReorderEndEventDetail>) {
    event.stopPropagation();
    event.detail.complete(false);
    const {from, to} = event.detail;
    if (from === to || this.reorderDisabled) return;
    const previous = this.labelGroups;
    const ordered = this.reordered(previous, from, to);
    this.reorderingGroups = true;
    this.labelGroups = ordered;
    this.error = '';
    this.labelService.saveAllGroups(ordered).pipe(finalize(() => {
      this.reorderingGroups = false;
      this.cdr.markForCheck();
    })).subscribe({
      error: () => {
        this.labelGroups = previous;
        this.error = 'Could not save the group order. Please try again.';
      },
    });
  }

  reorderLabels(event: CustomEvent<ReorderEndEventDetail>, group: LabelGroup) {
    event.stopPropagation();
    event.detail.complete(false);
    const {from, to} = event.detail;
    if (from === to || this.reorderDisabled) return;
    const previous = this.labels;
    const ordered = this.reordered(this.labelsForGroup(group.id), from, to);
    const byId = new Map(ordered.map(label => [label.id, label]));
    this.reorderingLabels = true;
    this.labels = this.labels.map(label => byId.get(label.id) ?? label);
    this.error = '';
    this.labelService.saveAllLabels(ordered).pipe(finalize(() => {
      this.reorderingLabels = false;
      this.cdr.markForCheck();
    })).subscribe({
      error: () => {
        this.labels = previous;
        this.error = 'Could not save the label order. Please try again.';
      },
    });
  }

  navigateBack() {
    void this.router.navigate(['/tabs/settings']);
  }

  labelsForGroup(groupId: string): Label[] {
    return getLabelsForGroup(this.labels, groupId).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }
}
