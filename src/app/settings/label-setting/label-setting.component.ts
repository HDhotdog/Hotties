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
    [this.labelService.labelGroups[ev.detail.from], this.labelService.labelGroups[ev.detail.to]]
      = [this.labelService.labelGroups[ev.detail.to], this.labelService.labelGroups[ev.detail.from]];
    //this.labelService.saveLabels();
    ev.detail.complete();
  }

  handleReorderOfLabels(ev: CustomEvent<ItemReorderEventDetail>, labelGroup: LabelGroup) {
    [labelGroup.labels[ev.detail.from], labelGroup.labels[ev.detail.to]]
      = [labelGroup.labels[ev.detail.to], labelGroup.labels[ev.detail.from]];
    //this.labelService.saveLabels();
    ev.detail.complete();
  }

  public navigateBack() {
    this.location.back()
  }

}
