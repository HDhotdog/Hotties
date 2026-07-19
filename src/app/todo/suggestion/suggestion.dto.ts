/** UI-facing suggestion model, distinct from the RxDB document shape (`RxSuggestion`). */
export interface Suggestion {
  id: string;
  categoryId: string;
  suggestion: string;
  suffix?: string;
}
