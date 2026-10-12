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
import {ITEM_SCHEMA_LITERAL} from "./schema/item.schema";
import {RxLabel, RxLabelGroup} from "../label/models/label";
import {environment} from "../../environments/environment";
import {CATALOG_SCHEMA_LITERAL} from './schema/catalog.schema';
import {SHOPPING_ENTRY_SCHEMA_LITERAL} from './schema/shopping-entry.schema';
import {STOCK_LOT_SCHEMA_LITERAL} from './schema/stock-lot.schema';
import {blankClass} from '../domain/catalog.model';
import {RECIPE_INGREDIENT_SCHEMA_LITERAL} from './schema/recipe-ingredient.schema';
import {OFF_PRODUCT_CACHE_SCHEMA_LITERAL} from './schema/off-product-cache.schema';
import {INTERNAL_PRODUCT_MAP_SCHEMA_LITERAL} from './schema/internal-product-map.schema';

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
  await db['catalog_nodes'].bulkUpsert([
    blankClass('root-food', 'Food', null),
    blankClass('root-household', 'Household', null),
  ]);

  // Persist flag
  await db['settings'].upsert({key: 'dbSeeded', value: 'true'});

  const kindLabelGroup: RxLabelGroup = {
    id: UUIDv4(),
    name: "Art",
    sortOrder: 0,
  }

  const kinds = ["Frühstück", "Mittagessen", "Abendessen", "Snack"];
  const kindLabels: RxLabel[] = kinds.map((kind, sortOrder) => {
    return {
      id: UUIDv4(),
      name: kind,
      sortOrder,
      groupId: kindLabelGroup.id,
      recipeId: ""
    }
  })

  const tasteLabelGroup: RxLabelGroup = {
    id: UUIDv4(),
    name: "Geschmack",
    sortOrder: 1
  }

  const tastes = ["Süß", "Scharf", "Salzig", "Sauer"]
  const tasteLabels: RxLabel[] = tastes.map((taste, sortOrder) => {
    return {
      id: UUIDv4(),
      name: taste,
      sortOrder,
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
 * `DatabaseService` so tests can use in-memory storage. Legacy mode loads
 * retired collections for migration tests; the app opens the active set.
 */
export async function createHottiesDatabase(storage: RxStorage<any, any>, dbName: string, legacyMode = true): Promise<RxDatabase> {
  const db = await createRxDatabase({
    name: dbName,
    storage: wrappedValidateAjvStorage({storage}),
  });

  const commonCollections = {
    settings: SETTINGS_SCHEMA_LITERAL,
    categories: CATEGORY_SCHEMA_LITERAL,
    suggestions: SUGGESTION_SCHEMA_LITERAL,
    recipes: RECIPE_SCHEMA_LITERAL,
    labels: LABEL_SCHEMA_LITERAL,
    label_groups: LABEL_GROUP_SCHEMA_LITERAL,
    catalog_nodes: CATALOG_SCHEMA_LITERAL,
  };
  if (legacyMode) {
    await db.addCollections({...commonCollections,
      todos: TODO_SCHEMA_LITERAL,
      ingredients: INGREDIENT_SCHEMA_LITERAL,
      fridge_items: FRIDGE_ITEM_SCHEMA_LITERAL,
      items: ITEM_SCHEMA_LITERAL,
    });
  } else {
    await db.addCollections({...commonCollections,
      shopping_entries: SHOPPING_ENTRY_SCHEMA_LITERAL,
      stock_lots: STOCK_LOT_SCHEMA_LITERAL,
      recipe_ingredients: RECIPE_INGREDIENT_SCHEMA_LITERAL,
      off_product_cache: OFF_PRODUCT_CACHE_SCHEMA_LITERAL,
      internal_product_map: INTERNAL_PRODUCT_MAP_SCHEMA_LITERAL,
    });
  }

  await runPendingMigrations(db);
  await seedInitialData(db);

  return db;
}

@Injectable()
export class DatabaseService {
  private readonly _dbHotties: Promise<RxDatabase>;

  constructor() {
    // Pre-release reset: keep the old store untouched and start with the new model.
    this._dbHotties = createHottiesDatabase(getRxStorageDexie(), 'dbhotties-catalog-v1', false)
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
