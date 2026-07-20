import { Injectable, inject } from '@angular/core';
import { Observable, from, of, switchMap } from 'rxjs';
import { RxRecipe } from './models/recipe';
import { AbstractRepository } from '../database/abstract-repository';
import { DatabaseService } from '../database/database';

const IMAGE_ATTACHMENT_ID = 'image';

@Injectable({
  providedIn: 'root',
})
export class RecipeRepository extends AbstractRepository<RxRecipe> {
  protected override database: DatabaseService;

  protected override collectionName: string = 'recipes';

  constructor() {
    const database = inject(DatabaseService);

    super(database);

    this.database = database;
  }

  public saveImage(id: string, blob: Blob): Observable<void> {
    return this.getCollection().pipe(
      switchMap((col) => col.findOne(id).exec()),
      switchMap((doc) =>
        from(
          doc!.putAttachment({
            id: IMAGE_ATTACHMENT_ID,
            data: blob,
            type: blob.type,
          })
        )
      ),
      switchMap(() => of(void 0))
    );
  }

  public getImage(id: string): Observable<Blob | null> {
    return this.getCollection().pipe(
      switchMap((col) => col.findOne(id).exec()),
      switchMap((doc) => {
        const attachment = doc?.getAttachment(IMAGE_ATTACHMENT_ID);
        return attachment ? from(attachment.getData()) : of(null);
      })
    );
  }

  public deleteImage(id: string): Observable<void> {
    return this.getCollection().pipe(
      switchMap((col) => col.findOne(id).exec()),
      switchMap((doc) => {
        const attachment = doc?.getAttachment(IMAGE_ATTACHMENT_ID);
        return attachment ? from(attachment.remove()) : of(void 0);
      })
    );
  }
}
