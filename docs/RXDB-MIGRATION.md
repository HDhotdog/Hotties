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
| Uncommitted | Label seeding moved to DB init; label/recipe wiring fixes started |

## Current Progress: ~75%

### Completed

| Area | Status | Notes |
|------|--------|-------|
| RxDB setup | ✅ Done | Database, plugins, localStorage adapter |
| Schema definitions | ✅ Done | 8 collections, all at version 0 |
| `AbstractRepository` | ✅ Done | Generic CRUD with RxJS observables |
| Category repository/service | ✅ Done | Fully on RxDB |
| Todo repository/service | ✅ Done | Fully on RxDB |
| Suggestion repository/service | ✅ Done | Fully on RxDB |
| Recipe repository/service | ✅ Done | Basic CRUD on RxDB |
| Label repository/service | ✅ Done | CRUD + group queries |
| Label group repository/service | ✅ Done | CRUD on RxDB |
| Ingredient repository | ✅ Done | Read by recipeId works |
| DB seeding | ✅ Done | Default category + label groups in `DatabaseService` |
| Old Preferences code | ✅ Removed | Commented out in repositories (cleanup pending) |

### In Progress / Broken

| Area | Status | Issue |
|------|--------|-------|
| Label TypeScript models | 🔴 Broken | `RxLabel`/`RxLabelGroup` interfaces replaced with enums in working tree — app won't compile |
| Recipe ingredients persistence | 🔴 Missing | Collected in UI, never saved to `ingredients` collection |
| Recipe label assignment | 🟡 Partial | Save path exists but `handleLabelChange()` creates labels with empty `groupId` |
| Recipe filtering | 🔴 Broken | `filterRecipes()` implementation commented out |
| Label display queries | 🔴 Bug | `labelsForGroup` / `labelsForRecipe` filter with `!==` (inverted logic) |
| Label settings UI | 🔴 Broken | `labelsForGroup` getter returns `[]` |
| Shopping list export | 🔴 Stub | `addIngredientsToCategory()` not implemented |
| Reactive live updates | 🟡 Mixed | Recent changes switched `findAll()` from `.$` to `.exec()` — lists won't auto-refresh |
| Cache reset | 🟡 Partial | Only clears categories, not full database |
| `initCategories()` | 🔴 Stub | Returns `of()` — cache reset after delete doesn't re-save category |

### Not Started

| Area | Notes |
|------|-------|
| Data migration script | No import path from old Preferences JSON → RxDB |
| IndexedDB adapter | `pouchdb-adapter-idb` in `package.json` but not wired |
| Schema migrations | Plugin loaded, no migration strategies defined |
| Recipe images/emoji | Fields removed from schema during migration |
| UI preferences in DB | `selectedCategoryId` still in `localStorage` |
| Legacy dependency cleanup | `@ionic/storage` provider, unused imports |
| Dev/prod RxDB config | Dev-mode plugin always active |
| Tests for repositories | No repository or DB integration tests |

---

## Completion Plan

### Phase 1 — Fix Blockers (1–2 days)

**Goal:** App compiles and core CRUD works end-to-end.

1. **Restore label models**
   - Revert `src/app/label/models/label.ts` to interfaces:
     ```typescript
     export interface RxLabel { id: string; groupId: string; recipeId: string; name: string; }
     export interface RxLabelGroup { id: string; name: string; }
     ```

2. **Fix inverted filter logic**
   - `recipe.component.ts`: `labelsForGroup(groupId)` → filter `label.groupId === groupId`
   - `recipe.component.ts`: `labelsForRecipe(recipeId)` → filter `label.recipeId === recipeId`

3. **Restore reactive queries**
   - `AbstractRepository.findAll()` → use `col.find().$` for live updates
   - Custom queries (`findByCategoryId`, `findByRecipeId`) → use `.$` where UI should auto-refresh
   - Keep `.exec()` only for one-shot operations (seeding, migrations)

4. **Re-enable recipe filtering**
   - Uncomment and adapt `filterRecipes()` to use normalized labels:
     ```typescript
     this.results = this._recipes.filter(recipe => {
       const matchesSearch = recipe.name.toLowerCase().includes(this.search.toLowerCase());
       const recipeLabels = this._labels.filter(l => l.recipeId === recipe.id);
       const matchesLabels = this._setFilters.length === 0 ||
         this._setFilters.every(f => recipeLabels.some(rl => rl.name === f.name));
       const matchesTime = !this.selectedTime || recipe.preparationTime <= this.selectedTime;
       return matchesSearch && matchesLabels && matchesTime;
     });
     ```
   - Bind template to `results` instead of `recipes`

5. **Fix label settings component**
   - Replace `labelsForGroup` getter with method `labelsForGroup(groupId: string)` querying `_labels`
   - Subscribe to `labelService.getAllLabels()` alongside groups in `ngOnInit`

### Phase 2 — Complete Data Relations (2–3 days)

**Goal:** All related entities persist correctly.

6. **Persist ingredients on recipe save**
   - Add `IngredientService.saveAll()` / `deleteByRecipeId()`
   - In `AddRecipeComponent.saveRecipe()`: delete old ingredients, bulk upsert new ones via `forkJoin`

7. **Fix label assignment on recipes**
   - Distinguish template labels (`recipeId: ""`) from recipe-specific labels
   - On save: delete existing labels for recipe, create new ones with correct `groupId` + `recipeId`
   - Fix `add-recipe.component.html` — select should bind label names or IDs consistently with `handleLabelChange()`

8. **Implement recipe → shopping list export**
   - Wire `CategoryService.addIngredientsToCategory()` to create `RxToDo` entries from `RxIngredient[]`
   - Call `TodoService.save()` for each ingredient

9. **Fix cache reset**
   - Implement `DatabaseService.reset()` that clears all collections and re-runs seed
   - Or expose per-collection delete through a unified settings action
   - Fix `initCategories()` to actually call `categoryRepository.saveAll()`

10. **Scope "clear todos" to current category**
    - Add `TodoRepository.deleteByCategoryId()` and use it in `TodoComponent.clearTodos()`

### Phase 3 — Legacy Cleanup & Migration (1–2 days)

**Goal:** Remove old storage code and migrate existing user data.

11. **Remove legacy storage dependencies**
    - Remove `Storage` provider from `TodoModule`
    - Remove unused `Preferences` imports
    - Remove commented-out Preferences code from repositories
    - Consider removing `@ionic/storage` from `package.json` if unused

12. **One-time data migration from Preferences**
    - On first RxDB init (before `dbSeeded`), check Preferences for old keys:
      - Recipes, labels, categories, todos, suggestions
    - Transform JSON blobs into normalized RxDB documents
    - Mark migration complete in `settings` collection
    - Only needed if users have existing installs with Preferences data

13. **Move UI preferences to RxDB**
    - Store `selectedCategoryId` in `settings` collection instead of `localStorage`

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
