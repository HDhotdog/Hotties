import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ItemReorderEventDetail } from '@ionic/angular';
import { Label, LabelGroup } from 'src/app/label/models/label.interface';
import { LabelService } from './label-service.service';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { v4 as uuidv4 } from 'uuid';
@Component({
  selector: 'app-label-setting-component',
  templateUrl: './label-setting.component.html',
  styleUrls: ['./label-setting.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class LabelSettingComponent implements OnInit {
  private _newGroupName: string = '';
  private _selectedGroup: LabelGroup | null = null;
  private _newLabelName: string = '';
  private _editingGroup: LabelGroup | null = null;
  private _editingLabel: { group: LabelGroup; label: Label } | null = null;
  private _editName: string = '';
  private _labelGroups: LabelGroup[] = [];

  constructor(
    private location: Location,
    public labelService: LabelService
  ) {}

  ngOnInit() {
    this.labelService.loadLabels().subscribe((labelGroups) => {
      this._labelGroups = labelGroups;
    });
  }

  handleReorderOfLabelGroups(ev: CustomEvent<ItemReorderEventDetail>) {
    this._labelGroups.splice(ev.detail.to, 0, this._labelGroups.splice(ev.detail.from, 1)[0]);
    this.labelService.saveLabels(this._labelGroups);
    this._editingGroup = null;
    ev.detail.complete();
  }

  handleReorderOfLabels(ev: CustomEvent<ItemReorderEventDetail>, labelGroup: LabelGroup) {
    ev.stopPropagation();
    labelGroup.labels.splice(ev.detail.to, 0, labelGroup.labels.splice(ev.detail.from, 1)[0]);
    this.labelService.saveLabels(this._labelGroups);
    this._editingLabel = null;
    this._editName = '';
    ev.detail.complete();
  }

  addLabelGroup() {
    if (this._newGroupName.trim()) {
      const newGroup: LabelGroup = {
        id: uuidv4(),
        name: this._newGroupName.trim(),
        labels: []
      };
      this._labelGroups.push(newGroup);
      this.labelService.saveLabels(this._labelGroups);
      this._newGroupName = '';
    }
  }

  addLabel() {
    if (this._selectedGroup && this._newLabelName.trim()) {
      const newLabel: Label = {
        name: this._newLabelName.trim()
      };
      this._selectedGroup.labels.push(newLabel);
      this.labelService.saveLabels(this._labelGroups);
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
        this.labelService.saveLabels(this._labelGroups);
      }
      this._editingGroup = null;
    } else if (this._editingLabel) {
      if (this._editName.trim() && this._editName !== this._editingLabel!.label.name) {
        this._editingLabel!.label.name = this._editName.trim();
        this.labelService.saveLabels(this._labelGroups);
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

  removeLabel(group: LabelGroup, label: Label) {
    const index = group.labels.indexOf(label);
    if (index > -1) {
      group.labels.splice(index, 1);
      this.labelService.saveLabels(this._labelGroups);
    }
  }

  removeLabelGroup(group: LabelGroup) {
    const index = this._labelGroups.indexOf(group);
    if (index > -1) {
      this._labelGroups.splice(index, 1);
      this.labelService.saveLabels(this._labelGroups);
    }
  }

  navigateBack() {
    this.location.back();
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
