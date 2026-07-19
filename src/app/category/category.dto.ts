/** UI-facing category model, distinct from the RxDB document shape (`RxCategory`). */
export interface Category {
  id: string;
  name: string;
  saveSuggestions: boolean;
}
