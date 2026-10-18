import {RxLabel, RxLabelGroup} from './label';
import {Label, LabelGroup} from './label.dto';

export function toLabel(doc: RxLabel): Label {
  return {id: doc.id, groupId: doc.groupId, recipeId: doc.recipeId, name: doc.name, ...(doc.origin ? {origin: doc.origin} : {}), ...(doc.translationKey ? {translationKey: doc.translationKey} : {}), sortOrder: doc.sortOrder ?? 0};
}

export function toRxLabel(label: Label): RxLabel {
  return {id: label.id, groupId: label.groupId, recipeId: label.recipeId, name: label.name, ...(label.origin ? {origin: label.origin} : {}), ...(label.translationKey ? {translationKey: label.translationKey} : {}), sortOrder: label.sortOrder ?? 0};
}

export function toLabelGroup(doc: RxLabelGroup): LabelGroup {
  return {id: doc.id, name: doc.name, ...(doc.origin ? {origin: doc.origin} : {}), ...(doc.translationKey ? {translationKey: doc.translationKey} : {}), sortOrder: doc.sortOrder ?? 0};
}

export function toRxLabelGroup(group: LabelGroup): RxLabelGroup {
  return {id: group.id, name: group.name, ...(group.origin ? {origin: group.origin} : {}), ...(group.translationKey ? {translationKey: group.translationKey} : {}), sortOrder: group.sortOrder ?? 0};
}
