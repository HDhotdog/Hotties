/** UI-facing label models, distinct from the RxDB document shapes (`RxLabel`/`RxLabelGroup`). */
export interface Label {
  id: string;
  groupId: string;
  recipeId: string;
  name: string;
  origin?: 'app' | 'user';
  translationKey?: string;
  sortOrder?: number;
}

export interface LabelGroup {
  id: string;
  name: string;
  origin?: 'app' | 'user';
  translationKey?: string;
  sortOrder?: number;
}
