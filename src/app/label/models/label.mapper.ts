import {RxLabel, RxLabelGroup} from './label';
import {Label, LabelGroup} from './label.dto';

export function toLabel(doc: RxLabel): Label {
  return {id: doc.id, groupId: doc.groupId, recipeId: doc.recipeId, name: doc.name, sortOrder: doc.sortOrder ?? 0};
}

export function toRxLabel(label: Label): RxLabel {
  return {id: label.id, groupId: label.groupId, recipeId: label.recipeId, name: label.name, sortOrder: label.sortOrder ?? 0};
}

export function toLabelGroup(doc: RxLabelGroup): LabelGroup {
  return {id: doc.id, name: doc.name, sortOrder: doc.sortOrder ?? 0};
}

export function toRxLabelGroup(group: LabelGroup): RxLabelGroup {
  return {id: group.id, name: group.name, sortOrder: group.sortOrder ?? 0};
}
