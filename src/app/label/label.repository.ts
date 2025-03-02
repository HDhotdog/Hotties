import { Injectable } from "@angular/core";
import { Preferences } from "@capacitor/preferences";
import { LabelGroup } from "./models/label.interface";
import { catchError, from, map, of, tap } from "rxjs";
import { Observable } from "rxjs";

@Injectable({
    providedIn: 'root'
})
export class LabelRepository {
    private readonly LABEL_STORAGE = 'labels';

    constructor() {}

    public saveAll(labelGroups: LabelGroup[]) {
        Preferences.set({ key: this.LABEL_STORAGE, value: JSON.stringify(labelGroups) })
            .then(() => console.log('Label groups saved successfully!'))
            .catch((error) => console.error('Error saving label groups:', error));
    }

    public findAll(): Observable<LabelGroup[]> {
        return from(Preferences.get({key: this.LABEL_STORAGE})).pipe(
            map(({value}) => (value ? JSON.parse(value) : []) as LabelGroup[]),
            catchError((error) => {
                console.error('Error getting label groups:', error);
                return of([]);
            })
        );    
    }

    public deleteAll(): Observable<void> {
        return from(Preferences.remove({key: this.LABEL_STORAGE}));
    }   

    public delete(labelGroup: LabelGroup): Observable<LabelGroup[]> {
        return this.findAll().pipe(
            map((labelGroups) => labelGroups.filter((lab) => lab.id !== labelGroup.id)),
            tap((labelGroups) => Preferences.set({key: this.LABEL_STORAGE, value: JSON.stringify(labelGroups)}))
        );
    }
}