import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

@Injectable({
    providedIn: 'root'
})
export class AppService {

    private INIT_STORAGE: string = 'initiated';
    private HEIGHT_STORAGE: string = 'first-height';
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

    public async saveHeight(height: number) {
        Preferences.set({ key: this.HEIGHT_STORAGE, value: JSON.stringify(height) });
    }

    public async loadHeight() {
        const { value } = await Preferences.get({ key: this.HEIGHT_STORAGE })
        return (value ? JSON.parse(value) : 0) as number;
    }
    
}
