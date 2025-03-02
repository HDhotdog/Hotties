import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { LabelRepository } from 'src/app/label/label.repository';
import { LabelGroup } from 'src/app/label/models/label.interface';

@Injectable({
  providedIn: 'root'
})
export class LabelService {

  constructor(private labelRepository: LabelRepository) {
  }

  public saveLabels(labelGroups: LabelGroup[]) {
    this.labelRepository.saveAll(labelGroups);
  }

  public loadLabels(): Observable<LabelGroup[]> {
    return this.labelRepository.findAll();
  }

  public clearLabels() {
    this.labelRepository.deleteAll();
  }
}
