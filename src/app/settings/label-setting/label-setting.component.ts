import { Component, OnInit, inject } from '@angular/core';

import { IonicModule } from '@ionic/angular';
import { Label, LabelGroup } from 'src/app/label/models/label.dto';
import { LabelService } from '../../label/label-service.service';
import { FormsModule } from '@angular/forms';
import { v4 as uuidv4 } from 'uuid';
import { combineLatest } from 'rxjs';
import { Router } from '@angular/router';
import { labelsForGroup as getLabelsForGroup } from '../../recipe/recipe-filter';

@Component({
  selector: 'app-label-setting-component',
  templateUrl: './label-setting.component.html',
  styleUrls: ['./label-setting.component.scss'],
  standalone: true,
  imports: [IonicModule, FormsModule],
})
export class LabelSettingComponent implements OnInit {
  private router = inject(Router);
  private labelService = inject(LabelService);

  private _newGroupName: string = '';
  private _selectedGroup: LabelGroup | null = null;
  private _newLabelName: string = '';
  private _editingGroup: LabelGroup | null = null;
  private _editingLabel: { group: LabelGroup; label: Label } | null = null;
  private _editName: string = '';
  private _labelGroups: LabelGroup[] = [];
  private _labels: Label[] = [];

  ngOnInit() {
    combineLatest([
      this.labelService.getAllLabelGroups(),
      this.labelService.getAllLabels(),
    ]).subscribe(([labelGroups, labels]) => {
      this._labelGroups = labelGroups;
      this._labels = labels;
    });
  }

  addLabelGroup() {
    if (this._newGroupName.trim()) {
      const newGroup: LabelGroup = {
        id: uuidv4(),
        name: this._newGroupName.trim(),
      };
      this._labelGroups.push(newGroup);
      this.labelService.saveLabelGroup(newGroup);
      this._newGroupName = '';
    }
  }

  addLabel() {
    if (this._selectedGroup && this._newLabelName.trim()) {
      const newLabel: Label = {
        id: uuidv4(),
        groupId: this._selectedGroup.id,
        recipeId: '',
        name: this._newLabelName.trim(),
      };
      this.labelService.saveLabel(newLabel);
      this._newLabelName = '';
    }
  }

  startEditingGroup(group: LabelGroup) {
    this._editingGroup = group;
    this._editName = group.name;
  }

  startEditingLabel(group: LabelGroup, label: Label) {
    this._editingLabel = { group, label };
    this._editName = label.name;
  }

  saveEdit() {
    if (this._editingGroup) {
      if (this._editName.trim() && this._editName !== this._editingGroup.name) {
        this._editingGroup.name = this._editName.trim();
        this.labelService.saveLabelGroup(this._editingGroup);
      }
      this._editingGroup = null;
    } else if (this._editingLabel) {
      if (
        this._editName.trim() &&
        this._editName !== this._editingLabel!.label.name
      ) {
        this._editingLabel!.label.name = this._editName.trim();
        this.labelService.saveLabel(this._editingLabel.label);
      }
      this._editingLabel = null;
    }
    this._editName = '';
  }

  cancelEdit() {
    this._editingGroup = null;
    this._editingLabel = null;
    this._editName = '';
  }

  removeLabel(label: Label) {
    this.labelService.deleteLabelById(label.id).subscribe();
  }

  removeLabelGroup(group: LabelGroup) {
    this.labelService.deleteLabelGroupById(group.id).subscribe();
  }

  navigateBack() {
    // Explicit destination rather than Location.back() (see AddRecipeComponent for why).
    void this.router.navigate(['/tabs/settings']);
  }

  labelsForGroup(groupId: string): Label[] {
    return getLabelsForGroup(this._labels, groupId);
  }

  get labelGroups(): LabelGroup[] {
    return this._labelGroups;
  }

  get selectedGroup(): LabelGroup | null {
    return this._selectedGroup;
  }

  set selectedGroup(group: LabelGroup | null) {
    this._selectedGroup = group;
  }

  get editingGroup(): LabelGroup | null {
    return this._editingGroup;
  }

  get editingLabel(): { group: LabelGroup; label: Label } | null {
    return this._editingLabel;
  }

  get editName(): string {
    return this._editName;
  }

  set editName(value: string) {
    this._editName = value;
  }

  get newLabelName(): string {
    return this._newLabelName;
  }

  set newLabelName(name: string) {
    this._newLabelName = name;
  }

  get newGroupName(): string {
    return this._newGroupName;
  }

  set newGroupName(name: string) {
    this._newGroupName = name;
  }
}
