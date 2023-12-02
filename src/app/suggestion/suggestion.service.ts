import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

@Injectable({
    providedIn: 'root'
})
export class SuggestionService {

    private SUGGESTION_STORAGE: string = 'suggestion';
    public suggestions: string[] = [];

    constructor() {
    }

    public async saveSuggestions() {
        Preferences.set({ key: this.SUGGESTION_STORAGE, value: JSON.stringify(this.suggestions) });
    }

    public async loadSuggestions() {
        const { value } = await Preferences.get({ key: this.SUGGESTION_STORAGE })
        this.suggestions = (value ? JSON.parse(value) : []) as string[];
    }

    public async clearSuggestions() {
        Preferences.remove({ key: this.SUGGESTION_STORAGE });
    }
}


export interface Suggestion {
    suggestion: string,
    suffix: string
}
