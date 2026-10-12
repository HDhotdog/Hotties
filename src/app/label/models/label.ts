export interface RxLabel {
  id: string;
  groupId: string;
  recipeId: string;
  name: string;
  sortOrder?: number;
}

export interface RxLabelGroup {
  id: string;
  name: string;
  sortOrder?: number;
}
