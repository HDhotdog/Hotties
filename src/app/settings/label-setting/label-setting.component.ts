import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ItemReorderEventDetail } from '@ionic/angular';
import { Label, LabelGroup } from 'src/app/label/models/label.interface';
import { LabelService } from './label-service.service';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-label-setting-component',
  templateUrl: './label-setting.component.html',
  styleUrls: ['./label-setting.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class LabelSettingComponent implements OnInit {
  newGroupName: string = '';
  selectedGroup: LabelGroup | null = null;
  newLabelName: string = '';
  editingGroup: LabelGroup | null = null;
  editingLabel: { group: LabelGroup; label: Label } | null = null;
  editName: string = '';

  constructor(
    private location: Location,
    public labelService: LabelService
  ) {}

  ngOnInit() {
    this.labelService.loadLabels();
  }

  handleReorderOfLabelGroups(ev: CustomEvent<ItemReorderEventDetail>) {
    this.labelService.labelGroups.splice(ev.detail.to, 0, this.labelService.labelGroups.splice(ev.detail.from, 1)[0]);
    this.labelService.saveLabels();
    ev.detail.complete();
  }

  handleReorderOfLabels(ev: CustomEvent<ItemReorderEventDetail>, labelGroup: LabelGroup) {
    ev.stopPropagation();
    labelGroup.labels.splice(ev.detail.to, 0, labelGroup.labels.splice(ev.detail.from, 1)[0]);
    this.labelService.saveLabels();
    this.editingLabel = null;
    this.editName = '';
    ev.detail.complete();
  }

  addLabelGroup() {
    if (this.newGroupName.trim()) {
      const newGroup: LabelGroup = {
        name: this.newGroupName.trim(),
        labels: []
      };
      this.labelService.labelGroups.push(newGroup);
      this.labelService.saveLabels();
      this.newGroupName = '';
    }
  }

  addLabel() {
    if (this.selectedGroup && this.newLabelName.trim()) {
      const newLabel: Label = {
        name: this.newLabelName.trim()
      };
      this.selectedGroup.labels.push(newLabel);
      this.labelService.saveLabels();
      this.newLabelName = '';
    }
  }

  startEditingGroup(group: LabelGroup) {
    this.editingGroup = group;
    this.editName = group.name;
  }

  startEditingLabel(group: LabelGroup, label: Label) {
    this.editingLabel = { group, label };
    this.editName = label.name;
  }

  saveEdit() {
    if (this.editingGroup) {
      if (this.editName.trim() && this.editName !== this.editingGroup.name) {
        this.editingGroup.name = this.editName.trim();
        this.labelService.saveLabels();
      }
      this.editingGroup = null;
    } else if (this.editingLabel) {
      if (this.editName.trim() && this.editName !== this.editingLabel.label.name) {
        this.editingLabel.label.name = this.editName.trim();
        this.labelService.saveLabels();
      }
      this.editingLabel = null;
    }
    this.editName = '';
  }

  cancelEdit() {
    this.editingGroup = null;
    this.editingLabel = null;
    this.editName = '';
  }

  removeLabel(group: LabelGroup, label: Label) {
    const index = group.labels.indexOf(label);
    if (index > -1) {
      group.labels.splice(index, 1);
      this.labelService.saveLabels();
    }
  }

  removeLabelGroup(group: LabelGroup) {
    const index = this.labelService.labelGroups.indexOf(group);
    if (index > -1) {
      this.labelService.labelGroups.splice(index, 1);
      this.labelService.saveLabels();
    }
  }

  navigateBack() {
    this.location.back();
  }
}
