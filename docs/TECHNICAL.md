# Hotties — Technical Documentation

> Historical architecture snapshot. The active shopping, catalog, stock, scan, and ingredient model is described in [SHARED-CATALOG.md](SHARED-CATALOG.md).

Personal Ionic/Angular mobile app for managing cooking recipes and a categorized shopping list. All data is stored locally; no backend is planned.

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Angular | 19.2 |
| UI | Ionic Angular | 8.4 |
| Native shell | Capacitor | 7.0 |
| Language | TypeScript | 5.7 |
| Styling | SCSS + Ionic theming | — |
| UI widgets | Angular Material (partial), Ionic components | 19.2 |
| Persistence | RxDB (localStorage adapter) | 16.20 |
| Reactive layer | RxJS | 7.8 |
| Testing | Jasmine + Karma | 5.6 / 6.4 |
| Linting | ESLint | 9.21 |
| Image handling | ngx-image-compress, Capacitor Camera/PWA elements | — |
| Emoji picker | @ctrl/ngx-emoji-mart | 9.2 |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    UI Components                         │
│  TodoComponent │ RecipeComponent │ Settings/*           │
└────────────┬────────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────────┐
│                    Services                              │
│  TodoService │ RecipeService │ CategoryService │         │
│  LabelService │ SuggestionService │ IngredientService   │
└────────────┬────────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────────┐
│              Repositories (AbstractRepository)           │
│  TodoRepository │ RecipeRepository │ LabelRepository │  │
│  LabelGroupRepository │ CategoryRepository │ ...        │
└────────────┬────────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────────┐
│              DatabaseService (RxDB)                      │
│  Collections: settings, categories, todos, suggestions,│
│  recipes, labels, label_groups, ingredients              │
└─────────────────────────────────────────────────────────┘
```

### Layer responsibilities

- **Components** — Standalone Angular/Ionic components. Most business logic still lives here rather than in services.
- **Services** — Thin facades over repositories. Injectable at root (`providedIn: 'root'`) except legacy module providers in `TodoModule`.
- **Repositories** — Extend `AbstractRepository<T>` and map to a single RxDB collection. Expose RxJS observables for CRUD and custom queries.
- **DatabaseService** — Bootstraps RxDB, registers schemas, seeds initial data on first run.

### Routing

| Path | Component | Purpose |
|------|-----------|---------|
| `/tabs/todo` | `TodoComponent` | Shopping list (default tab) |
| `/tabs/recipe` | `RecipeComponent` | Recipe list with filters |
| `/tabs/recipe/new` | `AddRecipeComponent` | Create recipe |
| `/tabs/recipe/new/:id` | `AddRecipeComponent` | Edit recipe |
| `/tabs/recipe/display/:id` | `RecipeDisplayComponent` | View recipe, export ingredients |
| `/tabs/settings` | `SettingsComponent` | Settings hub |
| `/tabs/settings/category` | `CategorySettingComponent` | Manage shopping categories |
| `/tabs/settings/label` | `LabelSettingComponent` | Manage label groups/labels |
| `/tabs/settings/cache` | `CacheSettingComponent` | Reset cached data |

Navigation uses a side menu (`TabsPage`) with three main sections: ToDo's, Recipes, Settings.

## Data Model (RxDB Collections)

All schemas are at version `0`. Primary keys are string UUIDs unless noted.

### `categories`

Shopping list store categories (e.g. supermarkets).

```typescript
interface RxCategory {
  id: string;
  name: string;
  saveSuggestions: boolean; // whether typed items become autocomplete suggestions
}
```

### `todos`

Shopping list items, scoped to a category.

```typescript
interface RxToDo {
  id: string;
  categoryId: string;
  name: string;
  importance: ImportanceLevel; // LOW | NORMAL | HIGH | VERY_HIGH
  done: boolean;
}
```

Note: completing an item **deletes** it rather than marking `done: true`.

### `suggestions`

Autocomplete suggestions per category for the shopping list input.

```typescript
interface RxSuggestion {
  id: string;
  categoryId: string;
  suggestion: string;
  suffix?: string;
}
```

### `recipes`

Core recipe metadata. Related data (ingredients, labels) lives in separate collections.

```typescript
interface RxRecipe {
  id: string;
  name: string;
  description: string;
  preparationTime: number; // total minutes
}
```

Fields previously stored inline (`imgSrc`, `emoji`, embedded ingredients/labels) are commented out during the RxDB migration.

### `ingredients`

Normalized ingredients linked to recipes.

```typescript
interface RxIngredient {
  id: string;
  recipeId: string;
  name: string;
}
```

### `labels`

Labels assigned to recipes. Template labels (seed data) use `recipeId: ""`.

```typescript
interface RxLabel {
  id: string;
  groupId: string;
  recipeId: string;
  name: string;
}
```

### `label_groups`

Groups for organizing labels (e.g. "Art", "Geschmack").

```typescript
interface RxLabelGroup {
  id: string;
  name: string;
}
```

### `settings`

Key-value metadata (e.g. `dbSeeded` flag).

```typescript
{ key: string; value: string }
```

## Database Initialization

`DatabaseService` (`src/app/database/database.ts`):

1. Creates database `dbhotties` with `getRxStorageLocalstorage()` wrapped in AJV validation.
2. Loads RxDB plugins: `dev-mode`, `migration-schema`, `validate-ajv`.
3. Registers all 8 collections.
4. On first run, seeds:
   - Default category "Edeka" (`saveSuggestions: true`)
   - Label groups "Art" and "Geschmack" with preset labels
   - Sets `settings.dbSeeded = true`

Seeding was moved from `AppComponent` into `DatabaseService` during the ongoing migration.

## Repository Pattern

`AbstractRepository<T>` provides:

| Method | Behavior |
|--------|----------|
| `findAll()` | All documents in collection |
| `findById(id)` | Single document or error |
| `save(entity)` | Upsert one document |
| `saveAll(entities)` | Bulk upsert |
| `deleteById(id)` | Remove by primary key |
| `deleteAll()` | Remove all documents |

Custom query methods (e.g. `findByCategoryId`, `findByRecipeId`) exist on specific repositories.

Repositories are `providedIn: 'root'`. `DatabaseService` is registered in `main.ts` bootstrap providers.

## Capacitor Usage (Native Layer)

Capacitor is **not** being replaced — only the **data persistence layer** migrated from Capacitor Preferences / Ionic Storage to RxDB.

Capacitor is still used for:

| Plugin | Usage |
|--------|-------|
| `@capacitor/keyboard` | Resize mode on native platforms |
| `@aashu-dubey/capacitor-statusbar-safe-area` | Status bar safe area CSS variable |
| `@capacitor/camera` / PWA elements | Photo upload for recipes (UI partially disabled) |
| `@capacitor/filesystem` | Available but not actively used in app code |
| `@capacitor/haptics`, `@capacitor/app`, `@capacitor/status-bar` | Installed, minimal/no direct usage in components |

## Legacy Persistence (Pre-RxDB)

Before RxDB, data was stored as JSON blobs in **Capacitor Preferences** with keys like `RECIPE_STORAGE`, `LABEL_STORAGE`. Repository files still contain commented-out Preferences code as reference.

Remaining legacy touchpoints:

- `@ionic/storage` still listed as a provider in `TodoModule` (unused)
- Unused `Preferences` imports in `settings.component.ts`, `suggestion.service.ts`
- `localStorage` for `selectedCategoryId` (UI preference, not app data)

## Feature Modules

### Shopping List (`todo/`)

- Category selector switches between shopping lists
- Priority/importance levels shown as colored indicators
- Random suggestion placeholder when input is empty
- Sort toggle (alphabetical asc/desc) — sort state not persisted
- "Clear all" removes **all** todos globally (not category-scoped)
- Suggestions saved per category when `saveSuggestions` is enabled

### Recipes (`recipe/`)

- List view with search bar and side filter menu
- Filter by label groups and preparation time (filter logic currently disabled in code)
- Create/edit with name, description, prep time, ingredients, labels
- Detail view with ingredient export to shopping list (export logic not fully wired)
- Image upload and emoji picker UI exist but persistence fields are commented out

### Settings (`settings/`)

- **Categories** — CRUD for shopping list categories
- **Labels** — CRUD for label groups and labels within groups
- **Cache** — Partial reset (categories only, re-seeds "Edeka")

## Project Structure

```
src/app/
├── database/
│   ├── database.ts              # RxDB bootstrap & seeding
│   ├── abstract-repository.ts   # Base CRUD repository
│   └── schema/                  # RxDB JSON schemas
├── todo/                        # Shopping list feature
├── recipe/                      # Recipe feature
├── category/                    # Shopping categories
├── label/                       # Labels & label groups
├── ingredients/                 # Recipe ingredients
├── settings/                    # Settings screens
├── tabs/                        # Tab shell & side menu
├── util/                        # Helpers (Optional type)
├── app.component.ts             # Root component
└── app-routing.module.ts        # Top-level routes

docs/                            # Documentation (this file)
resources/                       # App icons & native assets
capacitor.config.ts              # Capacitor app config
```

## Build & Deploy

```bash
# Development
npm start                  # ng serve

# Production web build
npm run build              # ionic build → www/

# Android deploy
npm run export             # build + cap copy + sync + open Android Studio
# Or manually:
ionic build
ionic cap copy
npx cap sync android
ionic cap open android
```

Production app ID and Java namespace: `io.github.hdhotdog.hotties`
Debug app ID: `io.github.hdhotdog.hotties.dev`
Web output: `www/`

## Testing

```bash
npm test                   # Karma + Jasmine
npm run lint               # ESLint
```

Test coverage is minimal. Most `.spec.ts` files are scaffolded stubs.

## Known Issues & Technical Debt

Documented in `src/roadmap.md` and expanded here:

1. **RxDB migration incomplete** — see `docs/RXDB-MIGRATION.md`
2. **Recipe filtering broken** — `filterRecipes()` body is commented out
3. **Label filter bugs** — `labelsForGroup` / `labelsForRecipe` use `!==` instead of `===`
4. **Ingredients not saved** — `AddRecipeComponent` collects ingredients but does not persist them
5. **Recipe → shopping list export** — `addIngredientsToCategory()` is a stub
6. **Label settings UI** — `labelsForGroup` getter returns empty array
7. **Model type regression** — `label.ts` interfaces were accidentally replaced with enums in uncommitted changes
8. **Reactive queries inconsistent** — some repositories use `.exec()` (one-shot) vs `.$` (live updates)
9. **Dev mode plugin always enabled** — should be gated by `environment.production`
10. **No schema migrations defined** — despite `RxDBMigrationSchemaPlugin` being loaded
11. **pouchdb-adapter-idb installed but unused** — likely intended for IndexedDB storage on mobile

## Design Principles

- Offline-first: all data local, no network dependency
- No backend planned
- Standalone Angular components (mixed with legacy NgModules for routing)
- German UI strings in seed data and some labels
