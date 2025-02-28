import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Label, LabelGroup } from 'src/app/label/models/label.interface';
import { LabelService } from '../label-service.service';

@Component({
  selector: 'app-label-manager',
  templateUrl: './label-manager.component.html',
  styleUrls: ['./label-manager.component.scss']
})
export class LabelManagerComponent implements OnInit {
  newGroupName: string = '';
  selectedGroup: LabelGroup | null = null;
  newLabelName: string = '';

  constructor(
    private modalCtrl: ModalController,
    public labelService: LabelService
  ) {}

  ngOnInit() {}

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

  dismiss() {
    this.modalCtrl.dismiss();
  }
}
