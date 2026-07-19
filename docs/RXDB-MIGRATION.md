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
| Uncommitted | Phase 3 legacy cleanup completed (see below) |

## Current Progress: ~95%

### Completed

| Area | Status | Notes |
|------|--------|-------|
| RxDB setup | ✅ Done | Database, plugins, localStorage adapter |
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

### In Progress / Broken

_(none blocking; remaining items are scoped enhancements, see Not Started)_

### Not Started

| Area | Notes |
|------|-------|
| Data migration script | No import path from old Preferences JSON → RxDB. Deliberately skipped: app is pre-release (`package.json` version `0.0.1`, not published), no installs have Preferences data to preserve |
| IndexedDB adapter | `pouchdb-adapter-idb` in `package.json` but not wired |
| Schema migrations | Plugin loaded, no migration strategies defined |
| Recipe images/emoji | Fields removed from schema during migration |
| Dev/prod RxDB config | Dev-mode plugin always active |
| Tests for repositories | No repository or DB integration tests (component-level tests exist) |

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

### Phase 4 — Production Hardening (2–3 days)

**Goal:** Stable storage for mobile production use.

14. **Switch to IndexedDB storage**
    - Replace `getRxStorageLocalstorage()` with IndexedDB adapter:
      ```typescript
      import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
      // or wire up existing pouchdb-adapter-idb
      ```
    - localStorage has size limits (~5 MB) — insufficient for recipe images

15. **Gate dev-mode plugin**
    ```typescript
    if (!environment.production) {
      addRxPlugin(RxDBDevModePlugin);
    }
    ```

16. **Define schema migrations**
    - Bump schema versions when adding fields (e.g. `imgSrc`, `emoji` back to recipes)
    - Add migration strategies in schema literals

17. **Restore recipe media fields** (optional, if needed)
    - Add `imgSrc` and `emoji` back to recipe schema (version 1)
    - Re-enable UI in add-recipe and recipe-display components

### Phase 5 — Quality (ongoing)

18. **Write repository tests**
    - Test CRUD operations against in-memory RxDB
    - Test seeding logic
    - Test custom queries (`findByCategoryId`, `findByRecipeId`)

19. **Split UI models from DB models** (from roadmap)
    - Introduce UI DTOs and mapping layer (Anti-Corruption Layer)

20. **Migrate to Jest** (from roadmap)

---

## Recommended Priority Order

```
Phase 1 (blockers)  →  Phase 2 (relations)  →  Phase 3 (cleanup)  →  Phase 4 (production)
```

Phases 1 and 2 are required for a usable app. Phase 3 matters only if existing installs have Preferences data. Phase 4 is needed before shipping to Play Store with images. Phase 5 is long-term quality.

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
