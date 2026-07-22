import {addRxPlugin, createRxDatabase, RxDatabase, RxStorage} from "rxdb";
import {RxDBDevModePlugin} from "rxdb/plugins/dev-mode";
import {wrappedValidateAjvStorage} from "rxdb/plugins/validate-ajv";
import {getRxStorageDexie} from "rxdb/plugins/storage-dexie";
import {RxDBAttachmentsPlugin} from "rxdb/plugins/attachments";
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
import {FRIDGE_ITEM_SCHEMA_LITERAL} from "./schema/fridge-item.schema";
import {RxLabel, RxLabelGroup} from "../label/models/label";
import {environment} from "../../environments/environment";

if (!environment.production) {
  addRxPlugin(RxDBDevModePlugin);
}
addRxPlugin(RxDBMigrationSchemaPlugin)
addRxPlugin(RxDBAttachmentsPlugin)

async function isDatabaseSeeded(db: RxDatabase): Promise<boolean> {
  const doc = await db['settings'].findOne('dbSeeded').exec();
  return !!doc;
}

async function seedInitialData(db: RxDatabase) {
  const seeded: boolean = await isDatabaseSeeded(db);
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

/**
 * Runs any pending schema migrations (e.g. recipes v0 -> v1 adding imgSrc/emoji).
 * A no-op for fresh installs and collections whose schema hasn't changed.
 */
async function runPendingMigrations(db: RxDatabase): Promise<void> {
  // migratePromise() is safe to call unconditionally: it resolves immediately
  // if nothing needs migrating. Gating on migrationNeeded() first is racy -
  // RxDB can auto-start a migration during addCollections() that hasn't
  // finished yet, so migrationNeeded() can already report false while the
  // migration is still in flight (e.g. while an async migration strategy is
  // still running), causing us to skip waiting for it.
  for (const collection of Object.values(db.collections) as any[]) {
    await collection.getMigrationState().migratePromise();
  }
}

/**
 * Creates and seeds a Hotties RxDatabase for the given storage. Extracted from
 * `DatabaseService` so tests can build an equivalent database against an
 * in-memory storage instead of the production IndexedDB (Dexie) adapter.
 */
export async function createHottiesDatabase(storage: RxStorage<any, any>, dbName: string): Promise<RxDatabase> {
  const db = await createRxDatabase({
    name: dbName,
    storage: wrappedValidateAjvStorage({storage}),
  });

  await db.addCollections({
    settings: SETTINGS_SCHEMA_LITERAL,
    categories: CATEGORY_SCHEMA_LITERAL,
    suggestions: SUGGESTION_SCHEMA_LITERAL,
    todos: TODO_SCHEMA_LITERAL,
    recipes: RECIPE_SCHEMA_LITERAL,
    labels: LABEL_SCHEMA_LITERAL,
    label_groups: LABEL_GROUP_SCHEMA_LITERAL,
    ingredients: INGREDIENT_SCHEMA_LITERAL,
    fridge_items: FRIDGE_ITEM_SCHEMA_LITERAL
  });

  await runPendingMigrations(db);
  await seedInitialData(db);

  return db;
}

@Injectable()
export class DatabaseService {
  private readonly _dbHotties: Promise<RxDatabase>;

  constructor() {
    this._dbHotties = createHottiesDatabase(getRxStorageDexie(), 'dbhotties')
      .then(db => {
        console.log('Database initialized:', db);
        return db;
      });
  }

  //used by abstract repo
  public async getDb(): Promise<RxDatabase> {
    return this._dbHotties; // waits until ready
  }
}
