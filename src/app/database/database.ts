import {addRxPlugin, createRxDatabase, RxDatabase, RxDocument} from "rxdb";
import {RxDBDevModePlugin} from "rxdb/plugins/dev-mode";
import {wrappedValidateAjvStorage} from "rxdb/plugins/validate-ajv";
import {getRxStorageLocalstorage} from "rxdb/plugins/storage-localstorage";
import {Injectable} from "@angular/core";
import {RxCategory} from "../category/category";
import {CATEGORY_SCHEMA_LITERAL} from "./category.schema";

addRxPlugin(RxDBDevModePlugin);

@Injectable()
export class DatabaseService {
  private readonly dbHotties: Promise<RxDatabase>;

  constructor() {
    this.dbHotties = this.initDatabase();
  }

  public async insertCategory(category: RxCategory): Promise<RxDocument> {
    const db = await this.getDb();
    return db['categories'].insert(category);
  }



  public async getDb(): Promise<RxDatabase> {
    return this.dbHotties; // waits until ready
  }

  private async initDatabase(): Promise<RxDatabase> {
    const db = await createRxDatabase({
      name: 'dbhotties',
      storage: wrappedValidateAjvStorage({
        storage: getRxStorageLocalstorage(),
      }),
    });

    await db.addCollections({
      categories: CATEGORY_SCHEMA_LITERAL,
    });

    console.log('Database initialized:', db);
    return db;
  }
}
