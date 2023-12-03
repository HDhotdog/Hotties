import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

@Injectable({
    providedIn: 'root'
})
export class AppService {

    private INIT_STORAGE: string = 'initiated';
    public firstTime: boolean = false;

    constructor() {
    }

    public async saveInitalValues() {
        Preferences.set({ key: this.INIT_STORAGE, value: JSON.stringify(this.firstTime) });
    }

    public async loadInitialValues() {
        const { value } = await Preferences.get({ key: this.INIT_STORAGE })
        this.firstTime = (value ? JSON.parse(value) : true);
    }
}
