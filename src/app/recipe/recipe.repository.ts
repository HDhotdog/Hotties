import {inject, Injectable} from '@angular/core';
import {distinctUntilChanged, from, map, Observable, of, switchMap} from 'rxjs';
import {RxRecipe} from './models/recipe';
import {AbstractRepository} from '../database/abstract-repository';
import {DatabaseService} from '../database/database';

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

  /** Live data for cached detail views; editor prefills still use the one-shot findById. */
  public observeById(id: string): Observable<RxRecipe | null> {
    return this.getCollection().pipe(
      switchMap(col => col.findOne(id).$),
      map(doc => doc ? doc.toJSON() as RxRecipe : null)
    );
  }

  public observeImage(id: string): Observable<Blob | null> {
    return this.getCollection().pipe(
      switchMap(col => col.findOne(id).$),
      map(doc => doc?.getAttachment(IMAGE_ATTACHMENT_ID) ?? null),
      // Recipe text saves also emit document changes. Only reread changed attachments.
      distinctUntilChanged((previous, current) => previous?.digest === current?.digest && previous?.type === current?.type),
      switchMap(attachment => attachment ? from(attachment.getData()) : of(null))
    );
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
