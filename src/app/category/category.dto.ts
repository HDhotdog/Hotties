/** UI-facing category model, distinct from the RxDB document shape (`RxCategory`). */
export interface Category {
  id: string;
  sortOrder?: number;
  name: string;
  saveSuggestions: boolean;
}
