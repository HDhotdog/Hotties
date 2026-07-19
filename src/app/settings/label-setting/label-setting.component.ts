import {Component, OnInit} from '@angular/core';
import {CommonModule, Location} from '@angular/common';
import {IonicModule} from '@ionic/angular';
import {RxLabel, RxLabelGroup} from 'src/app/label/models/label';
import {LabelService} from '../../label/label-service.service';
import {FormsModule} from '@angular/forms';
import {v4 as uuidv4} from 'uuid';
import {combineLatest} from 'rxjs';
import {labelsForGroup as getLabelsForGroup} from '../../recipe/recipe-filter';

@Component({
  selector: 'app-label-setting-component',
  templateUrl: './label-setting.component.html',
  styleUrls: ['./label-setting.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class LabelSettingComponent implements OnInit {
  private _newGroupName: string = '';
  private _selectedGroup: RxLabelGroup | null = null;
  private _newLabelName: string = '';
  private _editingGroup: RxLabelGroup | null = null;
  private _editingLabel: { group: RxLabelGroup; label: RxLabel } | null = null;
  private _editName: string = '';
  private _labelGroups: RxLabelGroup[] = [];
  private _labels: RxLabel[] = [];

  constructor(
    private location: Location,
    private labelService: LabelService
  ) {
  }

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
      const newGroup: RxLabelGroup = {
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
      const newLabel: RxLabel = {
        id: uuidv4(),
        groupId: this._selectedGroup.id,
        recipeId: "",
        name: this._newLabelName.trim()
      };
      this.labelService.saveLabel(newLabel);
      this._newLabelName = '';
    }
  }

  startEditingGroup(group: RxLabelGroup) {
    this._editingGroup = group;
    this._editName = group.name;
  }

  startEditingLabel(group: RxLabelGroup, label: RxLabel) {
    this._editingLabel = {group, label};
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
      if (this._editName.trim() && this._editName !== this._editingLabel!.label.name) {
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

  removeLabel(label: RxLabel) {
    this.labelService.deleteLabelById(label.id).subscribe();
  }

  removeLabelGroup(group: RxLabelGroup) {
    this.labelService.deleteLabelGroupById(group.id).subscribe();
  }

  navigateBack() {
    this.location.back();
  }

  labelsForGroup(groupId: string): RxLabel[] {
    return getLabelsForGroup(this._labels, groupId);
  }

  get labelGroups(): RxLabelGroup[] {
    return this._labelGroups;
  }

  get selectedGroup(): RxLabelGroup | null {
    return this._selectedGroup;
  }

  set selectedGroup(group: RxLabelGroup | null) {
    this._selectedGroup = group;
  }

  get editingGroup(): RxLabelGroup | null {
    return this._editingGroup;
  }

  get editingLabel(): { group: RxLabelGroup; label: RxLabel } | null {
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
