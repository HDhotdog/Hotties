import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { Category } from './category';

@Injectable({
    providedIn: 'root'
})
export class CategoryService {

    private CATEGORY_STORAGE: string = 'categories';
    private LAST_CATEGORY_INDEX: string = 'last-category';
    public categories: Category[] = [];
    public lastCategory: number = 0;

    constructor() {
    }

    public async saveCategories() {
        Preferences.set({ key: this.CATEGORY_STORAGE, value: JSON.stringify(this.categories) });
        Preferences.set({ key: this.LAST_CATEGORY_INDEX, value: JSON.stringify(this.lastCategory) });

    }

    public async loadCategories() {
        const { value } = await Preferences.get({ key: this.CATEGORY_STORAGE })
        this.categories = (value ? JSON.parse(value) : []) as Category[];
        this.loadLastCategory();
    }

    public async clearCategories() {
        this.categories.length = 0;
        Preferences.remove({ key: this.CATEGORY_STORAGE })
    }

    public async loadLastCategory() {
        const { value } = await Preferences.get({ key: this.LAST_CATEGORY_INDEX })
        this.lastCategory = (value ? JSON.parse(value) : 0) as number;
    }
}
