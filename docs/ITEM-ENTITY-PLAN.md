# Shared Item Entity — Design Plan

> Historical plan. The active catalog and quantity model is documented in [SHARED-CATALOG.md](SHARED-CATALOG.md).

## Goal

Today, "things you buy/store/cook with" are represented three separate times:

| Feature | Collection | Schema file | Identity |
|---|---|---|---|
| Shopping list | `todos` | `todo.schema.ts` | own `name: string`, no link to fridge or recipes |
| Fridge | `fridge_items` | `fridge-item.schema.ts` | own `name: string`, no link to shopping list or recipes |
| Recipe ingredients | `ingredients` | `ingredient.schema.ts` | own `name: string`, FK `recipeId` only |

Each collection re-declares `name`, and each duplicates unit/amount handling (`AmountUnit` enum) independently. There's no single place to hang shared attributes like price, calories, or nutritional data (already requested in [docs/IDEAS.md](docs/IDEAS.md) under "Extend ingredient attributes" and "Overview of ingredient stock"), and no way to say "the milk in my fridge is the same *thing* as the milk on my shopping list and the milk in this recipe."

The fix: introduce a core `items` collection modeling an item as **a buyable good as it's actually sold** — a package with a fixed price, unit, and amount (e.g. "milk, 1 litre carton, €1.29"). `todos` and `fridge_items` deal in whole packages of a given item, so they reference it directly via `itemId`. `ingredients` is trickier: a recipe rarely needs exactly one package's worth (e.g. a recipe needs 200ml of a 1L carton), so its `amount`/`unit` stay independent of the item's package size — see below. Once the cross-linking is in place, calories/nutritional data become straightforward additive fields on `items` rather than requiring a redesign.

This mirrors the existing `recipeId` FK pattern already used by `ingredients` and `labels` — no new architectural concept, just one more foreign key.

## Target data model

### New collection: `items`

`src/app/database/schema/item.schema.ts`

```ts
export const ITEM_SCHEMA_LITERAL = {
  schema: {
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
      id: { type: 'string', maxLength: 255 },
      name: { type: 'string', minLength: 1, maxLength: 255 },
      price: { type: ['number', 'null'], default: null },
      unit: { type: 'string', default: AmountUnit.PIECE },
      amount: { type: 'number', default: 1 },
    },
    required: ['id', 'name', 'unit', 'amount'],
  }
};
```

`RxItem` interface lives at `src/app/item/rxItem.ts`, following the `RxToDo` / fridge item convention.

Minimal for v0: identity (`id`, `name`) plus `price`, `unit`, and `amount`, which together describe **one package as sold** — "milk" is `{unit: LITER, amount: 1, price: 1.29}`, i.e. a 1L carton for €1.29. This is the thing a shopping-list entry or fridge stock entry counts in whole units of (e.g. "2 cartons of milk"), and it's what a usage record pre-fills with when a user first picks an existing item. It is **not** the same as the per-context amount already on `todos`/`fridge_items`/`ingredients` (see below) — those describe how many *packages* this specific entry wants/has, not a repackaged quantity. Calories, category, nutritional data, etc. remain deferred — added later purely as schema migrations on `items` once the cross-linking (this plan's actual scope) is proven out. That's the point of centralizing them here instead of in three places: the day those fields are needed, they're added once instead of three times.

### Existing collections become usage records referencing `itemId`

- **`todos`** (shopping list) — add `itemId: string`. Keep `categoryId`, `amount`, `done`. Since an item now models one package, `amount` here means "how many packages to buy" — a whole-number multiple of the item's own `unit`/`amount`, not a repackaged quantity. `name`/`type` become derived from the linked item (no denormalization, see Decisions).
- **`fridge_items`** — add `itemId: string`. Keep `expiryDate`, `quantity`, `amount` — same package-counting semantics as `todos` ("2 cartons of milk in stock"), not item facts.
- **`ingredients`** — add `itemId: string` alongside existing `recipeId: string`. Add `amount`/`unit` fields here too (currently ingredients have no quantity at all, which blocks "calculate calories of recipes" from IDEAS.md). Unlike `todos`/`fridge_items`, this amount is **independent of the item's package size** — a recipe needing "200 ml milk" references the same `items` row as a "1 L carton" package, in a different unit and a fraction of the package amount. Converting "recipe needs X of unit A" against "item comes packaged as Y of unit B" (for cost/calorie roll-ups) requires unit-conversion logic that isn't in this plan's v0 scope — flagged as follow-up work once `ingredients.amount`/`unit` exist to convert *from*.

Each becomes effectively a many-to-one join: many todos/fridge-items/ingredients can point at the same `items` row.

## Migration strategy

Each affected schema bumps its `version` and gets a `migrationStrategies[n]` entry, exactly like `todo.schema.ts`'s existing v0→v1 strategy and `recipe.schema.ts`'s chained v1/v2 strategies:

1. **Create `items` first**, registered as a new collection in `database.ts`'s `addCollections()` call (no migration needed, it's brand new).
2. **`todos` v1→v2**: for each old doc, find-or-create an `items` doc by matching `name` (case-insensitive), then set `oldDoc.itemId = matchedOrCreatedItem.id`. Since RxDB migration strategies run per-document and can be async here (unlike the deliberately-synchronous recipe attachment migration), this needs write access to the `items` collection during migration — handle this in `runPendingMigrations()` in `database.ts` similarly to how `seedInitialData` already gets `db` access, or via `oldCollection`/`newCollection` parameters RxDB passes into the strategy function.
3. **`fridge_items` v1→v2**: same find-or-create-by-name approach.
4. **`ingredients` v0→v1**: same approach, plus default `amount`/new unit fields.
5. Because all three migrations key off `name` matching against the same `items` collection, run them in a fixed order and de-duplicate by normalized name so "Milk" from the fridge and "milk" from a recipe converge on one `items` row rather than creating two.

This keeps the same migration shape already proven in this codebase (`todo.schema.ts`, `recipe.schema.ts`) — no new plugin, no new pattern, just three more `migrationStrategies` entries plus one cross-collection lookup helper.

## Application layer changes

Following the existing per-feature folder convention (`repository` + `service` + `models/dto+mapper`):

- New `src/app/item/` feature folder: `item.repository.ts` (extends `AbstractRepository<RxItem>`), `item.service.ts`, `models/item.dto.ts`, `models/item.mapper.ts`.
- `TodoService`/`FridgeService`(repository) gain a dependency on `ItemService` to resolve `itemId → RxItem` for display (name, package price/unit/amount) and to pre-fill a new `todos`/`fridge_items` entry's `amount` (defaulting to 1 package) and `unit` from the item's package `unit`. The ingredients equivalent resolves `itemId → RxItem` for name/price display only — its own `amount`/`unit` are entered independently, not pre-filled from the package size. All three can create an `items` row when a user adds a brand-new item name from any surface.
- UI: wherever a user currently types a free-text `name` (add-to-shopping-list, add-to-fridge, add-ingredient forms), switch to an autocomplete against `items.findAll()` with a "create new item" fallback — this is what actually delivers the "interconnected" behavior (typing "milk" once surfaces it everywhere).

## Rollout order

1. Add `item.schema.ts` + `RxItem` + register in `database.ts` (additive, no migration risk).
2. Build `ItemService`/`ItemRepository` + a minimal items list view for manual QA of the new collection in isolation.
3. Migrate `ingredients` first (smallest blast radius — recipes are the least-used feature) to prove out the find-or-create-by-name migration helper.
4. Migrate `fridge_items`, then `todos`, reusing the same helper.
5. Wire up the shared autocomplete UI last, once all three collections carry `itemId` reliably. **Done** — `src/app/item/item-autocomplete/` is a standalone `<app-item-autocomplete>` component wrapping an `ion-input` with a name-matching suggestion dropdown, dropped into the todo add bar, the fridge add-item form, and the recipe ingredient form. It only fills in the selected item's name; the existing `findOrCreateByName` linking still does the actual id resolution on save.

## Decisions

- **No denormalized `name`.** `todos`, `fridge_items`, and `ingredients` drop their local `name` field entirely and resolve display name through `itemId → items.name`. RxDB's reactive local queries make this join cheap, and it keeps `items` as the single source of truth for identity — no drift to worry about.
- **Name-matching collisions during migration are handled manually.** The migration's find-or-create-by-name step will merge case/whitespace variants ("Milk"/"milk") but not language or product variants ("Milch"/"Milk", "2% Milk"/"Milk"). That's acceptable — no review UI or fuzzy-matching is being built for this. Post-migration, a manual cleanup pass (e.g. renaming/merging duplicate `items` rows by hand) is the expected remedy.
- **Item deletion is blocked if referenced by a recipe.** Before deleting an `items` row, check whether any `ingredients` doc has a matching `itemId`; if so, refuse the delete (surface an error/toast naming the recipe(s)). This applies specifically to the `ingredients` (recipe) reference — `todos` and `fridge_items` are usage records for consumable stock and are expected to be freely deletable/completed without blocking item deletion. `ItemService.deleteById` (or the repository layer) is the right place for this check, mirroring how `AbstractRepository.deleteById` already centralizes delete logic.
- **Drop `HUNDRED_GRAM` ('100g') and `HUNDRED_MILLILITER` ('100ml') from `AmountUnit`** (`src/app/shared/amount-unit.enum.ts`). They're redundant now that an item's package `amount`/`unit` are separate numeric/unit fields: "100g" of something is just `{amount: 100, unit: GRAM}` — no need for a distinct unit constant. This is a prerequisite for later unit-conversion work (recipe amount vs. package amount, see above), since converting cleanly requires everything expressed in base units (`GRAM`/`MILLILITER`/`PIECE`/etc.), not pre-scaled ones. Scope note: this is a small, separable change (enum edit + a migration converting any existing `todos`/`fridge_items` docs stored with `'100g'`/`'100ml'` into `amount * 100` + `GRAM`/`MILLILITER`) — worth doing as its own step alongside this plan's rollout, not bundled into the `items` migrations above.

## New "Items" tab

A new feature mirrors the existing Fridge tab (`src/app/fridge/`), giving users a plain list view of every `items` row — this is also the natural place to manage merges/renames created by the manual cleanup step above.

- **Folder**: `src/app/item/` (already houses `ItemService`/`ItemRepository`/`RxItem`/DTO+mapper per the "Application layer changes" section above), plus:
  - `item.component.ts/.html/.scss` — list page, standalone component
  - `add-item/add-item.component.ts/.html/.scss` — add/edit form, reused for `new` and `edit/:id`, same pattern as `add-fridge-item`
  - `item.module.ts` + `item-routing.module.ts` — NgModule wrapper for lazy-loading, routes `''`, `new`, `edit/:id`
- **Routing/menu registration**: lazy-load `ItemModule` at path `'items'` in `src/app/tabs/tabs-routing.module.ts`, and add a corresponding `ion-item` (icon + label, `routerLink="/tabs/items"`) in `src/app/tabs/tabs.page.html` alongside the existing Fridge entry. (Despite the "tab" naming, this app uses a hamburger side-menu, not an `ion-tab-bar` — the new entry follows that existing convention.)
- **Page structure**: header toolbar with an add button opening the `new` route and a title; content area shows an empty state or a list of item rows (name, price, default amount + unit, given the v0 schema); each row supports edit and delete, where delete enforces the recipe-reference block described above. No sort/expiry-color logic is needed here since `items` v0 has no date field — that's the main structural difference from the Fridge page.
- **Rollout position**: build this after step 2 in the rollout order below ("minimal items list view for manual QA") — the tab described here *is* that QA view, just kept as a permanent feature instead of scaffolding.
