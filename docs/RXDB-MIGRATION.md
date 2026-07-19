# RxDB Migration — Status & Completion Plan

## Context

The app originally persisted all data as JSON strings in **Capacitor Preferences** (and `@ionic/storage` for the todo module). The migration replaces this with **RxDB** — a reactive, schema-validated local database with normalized collections.

**Important:** This is a persistence-layer migration only. **Capacitor remains** the native mobile runtime (keyboard, camera, status bar, Android/iOS builds).

## Migration Timeline (Git History)

| Commit | Milestone |
|--------|-----------|
| `fc7dd9f` | Introduce RxDB — `DatabaseService`, schemas, `AbstractRepository` |
| `9b90fed` | Categories, todos, suggestions migrated to RxDB |
| `60f25be` | Recipes migrated to RxDB |
| `4c4a22c` | "Klaus work" — fixed label models, inverted filter logic, reactive queries, recipe filtering |
| `f03ae5d` | Phase 2 complete — data relations, shopping list export, cache reset, tests |
| `759026f` | Phase 3 complete — legacy Preferences/`@ionic/storage` cleanup, settings collection |
| `d921c01` | Phase 4 complete (except deferred items) — IndexedDB storage, dev-mode gating |
| `fc43da9` | Phase 5 complete — Jest migration, repository tests, DTO/ACL layer |
| Uncommitted | Phase 4 items 16–17 complete — recipe imgSrc/emoji restored with a real schema migration (see below) |

## Current Progress: 100%

### Completed

| Area | Status | Notes |
|------|--------|-------|
| RxDB setup | ✅ Done | Database, plugins, IndexedDB (Dexie) adapter |
| Schema definitions | ✅ Done | 8 collections, all at version 0 |
| `AbstractRepository` | ✅ Done | Generic CRUD with RxJS observables |
| Category repository/service | ✅ Done | Fully on RxDB |
| Todo repository/service | ✅ Done | Fully on RxDB, scoped delete by category |
| Suggestion repository/service | ✅ Done | Fully on RxDB |
| Recipe repository/service | ✅ Done | Basic CRUD on RxDB |
| Label repository/service | ✅ Done | CRUD + group queries + scoped delete by recipe |
| Label group repository/service | ✅ Done | CRUD on RxDB |
| Ingredient repository/service | ✅ Done | Read by recipeId, scoped replace by recipe |
| DB seeding | ✅ Done | Default category + label groups in `DatabaseService` |
| Old Preferences/`@ionic/storage` code | ✅ Removed | Dead imports, `Storage` DI provider, and commented-out code deleted; both packages uninstalled |
| Settings repository/service | ✅ Done | Generic key/value `settings` collection wrapper (`SettingsRepository`/`SettingsService`) |
| UI preferences in DB | ✅ Fixed | `selectedCategoryId` now lives in the `settings` collection instead of `localStorage` |
| Label TypeScript models | ✅ Fixed | `RxLabel`/`RxLabelGroup` are interfaces again, app compiles |
| Recipe ingredients persistence | ✅ Fixed | `AddRecipeComponent.saveRecipe()` replaces ingredients via `RecipeService.saveIngredients()` |
| Recipe label assignment | ✅ Fixed | `handleLabelChange()` resolves the correct `groupId` from template labels; save replaces recipe labels |
| Recipe filtering | ✅ Fixed | `filterRecipes()` extracted to `recipe-filter.ts`, wired to template |
| Label display queries | ✅ Fixed | `labelsForGroup` / `labelsForRecipe` filter correctly (not inverted) |
| Label settings UI | ✅ Fixed | Uses shared `labelsForGroup` helper |
| Shopping list export | ✅ Fixed | `CategoryService.addIngredientsToCategory()` bulk-saves `RxToDo` entries via `TodoService.saveAll()` |
| Reactive live updates | ✅ Fixed | `findAll()` and custom finders use `.$` (live); one-shot ops use `.exec()`/`.remove()` |
| Cache reset | ✅ Fixed | `clearCategoryCache()` now subscribes and chains delete → reseed |
| `initCategories()` | ✅ Fixed | Calls `categoryRepository.saveAll()` |
| Repository/component tests | ✅ Fixed | Stale `todo.component.spec.ts` rewritten; 10 specs with standalone components misdeclared in `declarations` fixed to use `imports` + proper DI mocks |
| IndexedDB storage | ✅ Done | `getRxStorageDexie()` replaces `getRxStorageLocalstorage()`; verified in-browser (IndexedDB populated, `localStorage` empty, data survives reload) |
| Dev/prod RxDB config | ✅ Done | `RxDBDevModePlugin` only loaded when `!environment.production`; production build verified clean |
| Test runner | ✅ Done | Migrated from Karma/Jasmine to Jest (`jest-preset-angular`); all 23 pre-existing tests converted and passing |
| Repository/DB integration tests | ✅ Done | 31 new tests against an in-memory RxDB (`getRxStorageMemory()`) covering every repository's custom queries plus DB seeding logic |
| UI/DB model split (DTO/ACL layer) | ✅ Done | Every entity now has a UI-facing DTO (`Category`, `Todo`, `Suggestion`, `Recipe`, `Ingredient`, `Label`/`LabelGroup`) distinct from its RxDB document type (`RxCategory`, etc.), with mapper functions at the service boundary; components no longer import RxDB document types |
| Recipe images/emoji | ✅ Done | `imgSrc`/`emoji` restored to the recipe schema (`version: 1`, real migration strategy), `RxRecipe`/`Recipe` DTO, and UI (emoji picker + image upload in the edit form; emoji + image display in the list and detail views). Verified in-browser end-to-end |
| Schema migrations | ✅ Done | `RxDBMigrationSchemaPlugin` migration is now actually invoked (`runPendingMigrations()` in `database.ts`, generic across all collections) — previously the plugin was loaded but nothing ever called `migrationNeeded()`/`getMigrationState().migratePromise()`, so a version bump alone would have crashed on any existing install. Covered by an integration test that seeds a real v0 recipe document and asserts it migrates to v1 with correct defaults |
| Hours/Minutes recipe inputs | ✅ Fixed | Two bugs fixed together: (1) the Hours/Minutes inputs in `add-recipe.component.html` never fed into `preparationTime` — the `hours`/`minutes` setters in `add-recipe.component.ts` now also recompute `_prepTime = hours*60 + minutes`, and loading an existing recipe now decomposes `preparationTime` back into hours/minutes so the edit form pre-fills correctly (round-trip verified in-browser: 1h30m in → "1h 30m" shown in list/detail → 1/30 pre-filled on re-edit). (2) `parseDate()` (duplicated in `recipe.component.ts` and `recipe-display.component.ts`) divided by `recipe.preparationTime` instead of `60` when computing hours, which produced nonsense values (and `NaN`/division-by-zero for a `0`-minute recipe) — fixed to divide by `60` |

### In Progress / Broken

_(none blocking; remaining items are scoped enhancements, see Not Started)_

### Not Started

| Area | Notes |
|------|-------|
| Data migration script | No import path from old Preferences JSON → RxDB. Deliberately skipped: app is pre-release (`package.json` version `0.0.1`, not published), no installs have Preferences data to preserve |
| Unused `pouchdb-adapter-idb` dependency | Never wired up (predates the rxdb v16 storage-plugin architecture now in use); still listed in `package.json`, not removed in this pass |
| UI DTOs for `RxSetting` | Not introduced — nothing in the UI layer touches `RxSetting` directly (`SettingsService` already exposes only primitive strings), so there was no boundary to split |

---

## Completion Plan

### Phase 1 — Fix Blockers ✅ Done

**Goal:** App compiles and core CRUD works end-to-end.

All five items (label model interfaces, non-inverted filter logic, live `.$` queries, `filterRecipes()` wired to the template, working label settings component) were verified fixed as of the `4c4a22c` "Klaus work" commit — confirmed via a fresh audit rather than re-implemented.

### Phase 2 — Complete Data Relations ✅ Done

**Goal:** All related entities persist correctly.

6. **Persist ingredients on recipe save** — `IngredientRepository.deleteByRecipeId()` + `IngredientService.saveIngredientsForRecipe()` added; `AddRecipeComponent.saveRecipe()` now calls `RecipeService.saveIngredients()` in the save `forkJoin`.

7. **Fix label assignment on recipes** — `AddRecipeComponent` now loads template labels (`recipeId: ""`) via `LabelService.getTemplateLabels()`, resolves the correct `groupId` in `handleLabelChange()`, and `saveRecipe()` replaces all recipe labels via `LabelService.saveLabelsForRecipe()` (delete-then-save). `add-recipe.component.html` select now iterates `availableLabels` (template labels) instead of the recipe's already-assigned labels.

8. **Implement recipe → shopping list export** — `CategoryService.addIngredientsToCategory()` maps `RxIngredient[]` to `RxToDo[]` and bulk-saves via `TodoService.saveAll()`; `RecipeDisplayComponent.saveIngredients()` passes its already-loaded ingredients and subscribes.

9. **Fix cache reset** — `initCategories()` calls `categoryRepository.saveAll()`; `CacheSettingComponent.clearCategoryCache()` chains delete → reseed with `switchMap` and subscribes (previously the reseed observable was never subscribed to, so it silently did nothing).

10. **Scope "clear todos" to current category** — `TodoRepository.deleteByCategoryId()` + `TodoService.deleteByCategoryId()` added; `TodoComponent.clearTodos()` now scopes to `selectedCategory.id` instead of wiping every category's todos.

Additionally, all Karma unit tests were brought back to green (`ng test`): rewrote the stale `todo.component.spec.ts` (referenced removed `RxCategory.elements` and a settable `currentImportanceLevel`), and fixed 10 other spec files that declared standalone components via the legacy `declarations` array instead of `imports`, adding the DI mocks (`ActivatedRoute`, `Router`, `Location`, services) those components need.

### Phase 3 — Legacy Cleanup & Migration ✅ Done (except item 12, deliberately skipped)

**Goal:** Remove old storage code and migrate existing user data.

11. **Remove legacy storage dependencies** ✅ — Removed the `Storage` provider and import from `TodoModule` (also dropped the redundant `TodoService`/`SuggestionService`/`CategoryService` re-registrations there, since all three are already `providedIn: 'root'`); removed dead `Preferences` imports from `suggestion.service.ts` and `settings.component.ts`; deleted commented-out Preferences code from `label.repository.ts` and `recipe.repository.ts`; uninstalled `@capacitor/preferences` and `@ionic/storage` from `package.json` (confirmed via full-tree grep that nothing else referenced them).

12. **One-time data migration from Preferences** — **Skipped by decision**, not implemented. Confirmed with the project owner: app is pre-release (version `0.0.1`, unpublished), no installs exist with real Preferences data to lose. Revisit only if that changes before shipping.

13. **Move UI preferences to RxDB** ✅ — Added `SettingsRepository`/`SettingsService` (`src/app/database/settings/`) wrapping the existing key/value `settings` collection. `CategoryService.getSelectedCategoryId()` / `saveCurrentCategory()` now read/write through it instead of `localStorage`; `TodoComponent.init()` combines the categories and selected-id streams reactively. Note: this changed `saveCurrentCategory()` from a synchronous void method to an `Observable` that must be subscribed — both call sites were updated accordingly (and a pre-existing latent bug where `changeSort()`'s `categoryService.save()` call was never subscribed, so sort order silently never persisted, was fixed in passing).

### Phase 4 — Production Hardening ✅ Done

**Goal:** Stable storage for mobile production use.

14. **Switch to IndexedDB storage** ✅ — `database.ts` now uses `getRxStorageDexie()` (`rxdb/plugins/storage-dexie`) instead of `getRxStorageLocalstorage()`. Verified in-browser: all 8 collections show up as `rxdb-dexie-dbhotties--0--*` IndexedDB databases, `localStorage` is empty, and data survives a page reload. `pouchdb-adapter-idb` (an old rxdb-v9-era pouchdb plugin, incompatible with the rxdb v16 storage-plugin architecture already in use) was never wired up and remains an unused `package.json` entry — not removed in this pass, flagged for cleanup.

15. **Gate dev-mode plugin** ✅ — `addRxPlugin(RxDBDevModePlugin)` in `database.ts` is now wrapped in `if (!environment.production)`. Verified the production build (`ng build --configuration production`) still compiles clean with the plugin excluded from that path.

16. **Define schema migrations** ✅ — `RECIPE_SCHEMA_LITERAL` bumped to `version: 1` with a `migrationStrategies: {1: ...}` that defaults `imgSrc` to `''` and `emoji` to `null` on old documents. Discovered that the `RxDBMigrationSchemaPlugin` being loaded does **not** auto-run migrations in rxdb v16 — you must explicitly call `collection.migrationNeeded()` / `collection.getMigrationState().migratePromise()`, or a version bump against an existing install silently never migrates (old-schema docs stay stuck, or every read throws). Added `runPendingMigrations(db)` to `database.ts`, called after `addCollections()`, generic across all collections so any future schema bump on any entity is covered automatically. Proven with a real integration test in `database.spec.ts`: seeds a v0-schema recipe document, reopens the same storage with the current (v1) schema, and asserts the document migrated with the correct defaults.

17. **Restore recipe media fields** ✅ — `imgSrc`/`emoji` added back to `RxRecipe`, the `Recipe` DTO, and `recipe.mapper.ts`. `AddRecipeComponent` now actually loads/saves them (the emoji-picker and image-upload UI in `add-recipe.component.html` were already fully wired, just never fed real data) and `inputChanged()` accounts for them so the save button activates correctly. Re-enabled the previously-commented-out emoji span and `ion-img` in both `recipe.component.html` (list) and `recipe-display.component.html` (detail). Verified end-to-end in-browser: picked an emoji on an existing recipe, saved, and confirmed it displays in both the list and detail views and survives a page reload.

    **Two more bugs found and fixed while verifying this in the browser** (both pre-existing, unrelated to imgSrc/emoji specifically, but blocked verifying the edit flow):
    - `AddRecipeComponent`'s edit-mode data loading (`ngOnInit()`'s `if (index)` branch) used `forkJoin([recipe, ingredients, templateLabels, recipeLabels])` — but every one of those four sources is a live RxDB query (`.$`) that never completes, and `forkJoin` only emits once *all* sources complete. The result: opening any existing recipe for editing loaded a **permanently empty form**, silently. Switched to `combineLatest`, matching the pattern already used correctly elsewhere (`todo.component.ts`, `recipe-display.component.ts`).
    - `AddCategorySettingComponent` had the identical bug (`forkJoin([categoryObservable, categoriesObservable])`), plus called `getCategoryById(id)` even when creating a *new* category (`id` is `null`), which throws inside `AbstractRepository.findById()` since a null id never resolves to a document — so editing *or* creating a category via that screen never worked either. Restructured `ngOnInit()` to only fetch the category when an id is present, and to use `combineLatest` for the edit path.

    Neither bug was caught by the unit tests (`add-recipe.component.spec.ts` / `add-category-setting.component.spec.ts` only assert `should create`, not that data actually loads) or by the type checker, since `forkJoin`/`combineLatest` are both valid `Observable<[A,B,...]>`-returning calls — only end-to-end browser testing surfaced it.

### Phase 5 — Quality ✅ Done

20. **Migrate to Jest** ✅ — Replaced Karma/Jasmine with Jest (`jest-preset-angular` + `jest-environment-jsdom`). Removed `karma.conf.js`, `src/test.ts`, the `karma`/`jasmine-*`/`@types/jasmine` packages, and the `test` architect target in `angular.json`; added `jest.config.js`, `setup-jest.ts` (zone test env + a `crypto.subtle` polyfill via `node:crypto`, since jsdom doesn't implement it and RxDB needs it to hash schemas), and `modulePaths: ['<rootDir>']` so the existing `src/app/...` absolute imports resolve. All 23 pre-existing specs were converted (`jasmine.createSpyObj` → manual `jest.fn()` mocks, `jasmine.clock()` → `jest.useFakeTimers()`, `toBeTrue()/toBeFalse()` → `toBe(true/false)`, etc.) and pass under Jest.

18. **Write repository tests** ✅ — Added `createHottiesDatabase(storage, dbName)` to `database.ts` (extracted from `DatabaseService`, storage-agnostic) plus a `createTestDatabase()` test helper (`src/app/database/test-support/`) that builds a fresh, seeded, in-memory RxDB (`rxdb/plugins/storage-memory`) per test. 31 new integration tests cover: generic CRUD via `AbstractRepository` (save/upsert, saveAll, findById error case, deleteById, deleteAll, live `findAll()`), every repository's custom queries (`findByCategoryId`, `deleteByCategoryId`, `findByRecipeId`, `deleteByRecipeId`, `findDistinctNames`, `findUniqueLabels`, `deleteByLabelGroupId`, `SettingsRepository.findByKey`), and DB seeding logic (collections created, exactly one default category seeded, label groups/labels seeded as templates, `dbSeeded` flag prevents re-seeding).

19. **Split UI models from DB models** ✅ — Every entity now has a UI-facing DTO distinct from its RxDB document type, with mapper functions (`toXxx`/`toRxXxx`) applied at the Service layer boundary — repositories still speak `RxCategory`/`RxToDo`/etc., but `CategoryService`, `TodoService`, `SuggestionService`, `RecipeService`, `IngredientService`, and `LabelService` now expose `Category`, `Todo`, `Suggestion`, `Recipe`, `Ingredient`, `Label`/`LabelGroup`. Every component updated accordingly (imports switched from `../x/x` to `../x/x.dto`); no component or template references an `RxDB` document type anymore. New files per entity: `<entity>.dto.ts` + `<entity>.mapper.ts` (label got both `Label` and `LabelGroup` in one `label.dto.ts`/`label.mapper.ts`). `RxSetting` was left alone — `SettingsService` already only exposes primitive strings, so there's no UI-facing shape to split out.

    **Bug found and fixed while smoke-testing this refactor:** `AddRecipeComponent.saveRecipe()` generated a *new* `uuidv4()` for the recipe id when creating a new recipe, instead of reusing `this._recipe.id` (the id already assigned in `ngOnInit()` and used to stamp `recipeId` on every ingredient/label as the user filled out the form). The saved recipe and its ingredients/labels ended up with mismatched ids — ingredients were written to IndexedDB successfully but were permanently orphaned from their recipe, so they silently never appeared again. This is pre-existing (predates this session, unrelated to the DTO renaming) but was only caught by end-to-end browser testing, not by the type checker or unit tests since both sides independently produced valid-looking UUIDs. Fixed in `add-recipe.component.ts` by reusing `this._recipe.id`; verified in-browser that a newly created recipe's ingredient round-trips correctly and exports to the shopping list.

---

## Recommended Priority Order

```
Phase 1 (blockers)  →  Phase 2 (relations)  →  Phase 3 (cleanup)  →  Phase 4 (production)  →  Phase 5 (quality)
```

Phases 1 and 2 are required for a usable app. Phase 3 matters only if existing installs have Preferences data. Phase 4 is needed before shipping to Play Store with images. Phase 5 is long-term quality — all done in this pass.

## Quick Verification Checklist

After completing Phase 1–2, manually verify:

- [ ] App starts without TypeScript errors
- [ ] Default "Edeka" category appears on fresh install
- [ ] Add/remove shopping list items per category
- [ ] Switch categories persists selection
- [ ] Create recipe with ingredients → reload → ingredients visible
- [ ] Assign labels to recipe → labels show on list and detail
- [ ] Filter recipes by label and search text
- [ ] Export recipe ingredients to shopping list
- [ ] Manage label groups/labels in settings
- [ ] Edit and delete recipes
- [ ] Clear cache resets app to defaults

## Architecture Decision Record

**Why RxDB over Capacitor Preferences?**

| Concern | Preferences (old) | RxDB (new) |
|---------|-------------------|------------|
| Data shape | Single JSON blob per entity type | Normalized collections with relations |
| Querying | Load all, filter in memory | Indexed queries with selectors |
| Reactivity | Manual refresh | Observable streams (`.$`) |
| Validation | None | JSON Schema via AJV |
| Schema evolution | Manual migration scripts | Built-in migration plugin |
| Size limits | Preferences ~ few MB | IndexedDB ~ much larger |

**Why keep Capacitor?**

Capacitor provides the native Android/iOS shell, camera, keyboard, and status bar — unrelated to data persistence.
