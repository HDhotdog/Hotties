export interface RxLabel {
  id: string;
  groupId: string;
  recipeId: string;
  name: string;
  origin?: 'app' | 'user';
  translationKey?: string;
  sortOrder?: number;
}

export interface RxLabelGroup {
  id: string;
  name: string;
  origin?: 'app' | 'user';
  translationKey?: string;
  sortOrder?: number;
}
