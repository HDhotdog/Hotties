/** UI-facing label models, distinct from the RxDB document shapes (`RxLabel`/`RxLabelGroup`). */
export interface Label {
  id: string;
  groupId: string;
  recipeId: string;
  name: string;
  sortOrder?: number;
}

export interface LabelGroup {
  id: string;
  name: string;
  sortOrder?: number;
}
