import {Component, OnInit} from '@angular/core';
import { Location } from '@angular/common';
import {ItemReorderEventDetail} from "@ionic/angular";
import {LabelService} from "./label-service.service";
import {LabelGroup} from "../../recipe/recipe";

@Component({
  selector: 'app-label-setting-component',
  templateUrl: './label-setting.component.html',
  styleUrls: ['./label-setting.component.scss'],
})
export class LabelSettingComponent implements OnInit {

  constructor(public labelService: LabelService, private location: Location) { }

  ngOnInit(): void {
        this.labelService.loadLabels();
    }

  handleReorderOfLabelGroups(ev: CustomEvent<ItemReorderEventDetail>) {
    this.labelService.labelGroups.splice(ev.detail.to, 0, this.labelService.labelGroups.splice(ev.detail.from, 1)[0]);
    this.labelService.saveLabels();
    
    ev.detail.complete();
    ev.stopPropagation();
  }

  handleReorderOfLabels(ev: CustomEvent<ItemReorderEventDetail>, labelGroup: LabelGroup) {
    labelGroup.labels.splice(ev.detail.to, 0, labelGroup.labels.splice(ev.detail.from, 1)[0]);
    this.labelService.saveLabels();

    ev.detail.complete();
    ev.stopPropagation();
  }

  public navigateBack() {
    this.location.back()
  }

}
