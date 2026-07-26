import {RxCollection, RxDatabase, RxDocument} from "rxdb";
import {from, map, Observable, of, switchMap, throwError} from "rxjs";

export abstract class AbstractRepository<T> {

  /** Must be implemented by child classes to specify the collection name **/
  protected abstract collectionName: string;

  /** Inject database service into concrete repositories **/
  protected constructor(protected database: { getDb: () => Promise<RxDatabase> }) {
  }

  /** Convenience accessor for the RxDB collection */
  protected getCollection(): Observable<RxCollection<T>> {
    return from(this.database.getDb()).pipe(
      map(db => db[this.collectionName] as RxCollection<T>)
    );
  }

  /** Live findAll (auto-updating Observable) */
  public findAll(): Observable<T[]> {
    return this.getCollection().pipe(
      switchMap(col => col.find().$)
    );
  }

  /**
   * One-shot lookup by id (does not stay subscribed to future changes). Every
   * current caller uses this to prefill a form once in ngOnInit and never
   * unsubscribes; a live query here would leak a subscription for the
   * component's whole lifetime (and beyond, since Angular doesn't auto-unsubscribe
   * plain .subscribe() calls) that throws "not found" the moment the document is
   * later deleted elsewhere - which then surfaces as an uncaught error disrupting
   * an unrelated change-detection cycle.
   */
  public findById(id: string): Observable<T> {
    return this.getCollection().pipe(
      switchMap(col => from(col.findOne(id).exec())),
      switchMap(doc => {
        if (doc) {
          return of(doc);
        } else {
          return throwError(() => new Error(`Document with id "${id}" not found`));
        }
      })
    );
  }

  /** Save or update a single document (upsert) */
  public save(entity: T): Observable<RxDocument<T>> {
    return this.getCollection().pipe(
      switchMap(col => from(col.upsert(entity)))
    );
  }

  /** Save or update multiple documents (bulkUpsert) */
  public saveAll(entities: T[]): Observable<RxDocument<T>[]> {
    return this.getCollection().pipe(
      switchMap(col => from(col.bulkUpsert(entities))),
      map(result => result.success)
    );
  }

  public deleteById(id: string): Observable<boolean> {
    return this.getCollection().pipe(
      switchMap(col => col.findOne(id).exec()), // fetch the document
      switchMap(doc => {
        if (!doc) return of(false);           // nothing to delete
        return from(doc.remove()).pipe(map(() => true)); // deleted
      })
    );
  }

  public deleteAll(): Observable<number> {
    return this.getCollection().pipe(
      switchMap(col => from(col.find().remove())), // deletes all docs
      map(deletedDocs => deletedDocs.length)      // return number of deleted docs
    );
  }
}
