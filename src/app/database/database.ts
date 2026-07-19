import {addRxPlugin, createRxDatabase, RxDatabase} from "rxdb";
import {RxDBDevModePlugin} from "rxdb/plugins/dev-mode";
import {wrappedValidateAjvStorage} from "rxdb/plugins/validate-ajv";
import {getRxStorageLocalstorage} from "rxdb/plugins/storage-localstorage";
import {Injectable} from "@angular/core";
import {CATEGORY_SCHEMA_LITERAL} from "./schema/category.schema";
import {TODO_SCHEMA_LITERAL} from "./schema/todo.schema";
import {RECIPE_SCHEMA_LITERAL} from "./schema/recipe.schema";
import {SETTINGS_SCHEMA_LITERAL} from "./schema/db-metadata.schema";
import {RxDBMigrationSchemaPlugin} from "rxdb/plugins/migration-schema";
import {SUGGESTION_SCHEMA_LITERAL} from "./schema/suggestion.schema";
import {RxCategory} from "../category/category";
import {v4 as UUIDv4} from 'uuid';
import {LABEL_SCHEMA_LITERAL} from "./schema/label.schema";
import {LABEL_GROUP_SCHEMA_LITERAL} from "./schema/label-groups.schema";
import {INGREDIENT_SCHEMA_LITERAL} from "./schema/ingredient.schema";
import {RxLabel, RxLabelGroup} from "../label/models/label";

addRxPlugin(RxDBDevModePlugin);
addRxPlugin(RxDBMigrationSchemaPlugin)

@Injectable()
export class DatabaseService {
  private readonly _dbHotties: Promise<RxDatabase>;

  constructor() {
    this._dbHotties = this.initDatabase();
  }

  //used by abstract repo
  public async getDb(): Promise<RxDatabase> {
    return this._dbHotties; // waits until ready
  }

  private async initDatabase(): Promise<RxDatabase> {
    const db = await createRxDatabase({
      name: 'dbhotties',
      storage: wrappedValidateAjvStorage({
        storage: getRxStorageLocalstorage(),
      }),
    });

    await db.addCollections({
      settings: SETTINGS_SCHEMA_LITERAL,
      categories: CATEGORY_SCHEMA_LITERAL,
      suggestions: SUGGESTION_SCHEMA_LITERAL,
      todos: TODO_SCHEMA_LITERAL,
      recipes: RECIPE_SCHEMA_LITERAL,
      labels: LABEL_SCHEMA_LITERAL,
      label_groups: LABEL_GROUP_SCHEMA_LITERAL,
      ingredients: INGREDIENT_SCHEMA_LITERAL
    });

    await this.seedInitialData(db);

    console.log('Database initialized:', db);
    return db;
  }

  private async isDatabaseSeeded(db: RxDatabase): Promise<boolean> {
    const doc = await db['settings'].findOne('dbSeeded').exec();
    return !!doc;
  }

  private async seedInitialData(db: RxDatabase) {
    const seeded: boolean = await this.isDatabaseSeeded(db);
    if (seeded) return;

    const edeka: RxCategory = {
      id: UUIDv4(),
      name: "Edeka",
      saveSuggestions: true
    };

    await db['categories'].upsert(edeka);

    // Persist flag
    await db['settings'].upsert({key: 'dbSeeded', value: 'true'});

    const kindLabelGroup: RxLabelGroup = {
      id: UUIDv4(),
      name: "Art",
    }

    const kinds = ["Frühstück", "Mittagessen", "Abendessen", "Snack"];
    const kindLabels: RxLabel[] = kinds.map((kind) => {
      return {
        id: UUIDv4(),
        name: kind,
        groupId: kindLabelGroup.id,
        recipeId: ""
      }
    })

    const tasteLabelGroup: RxLabelGroup = {
      id: UUIDv4(),
      name: "Geschmack"
    }

    const tastes = ["Süß", "Scharf", "Salzig", "Sauer"]
    const tasteLabels: RxLabel[] = tastes.map((taste) => {
      return {
        id: UUIDv4(),
        name: taste,
        groupId: tasteLabelGroup.id,
        recipeId: ""
      }
    });

    await db['label_groups'].bulkUpsert([kindLabelGroup, tasteLabelGroup]);
    await db['labels'].bulkUpsert(tasteLabels.concat(kindLabels));
  }
}
