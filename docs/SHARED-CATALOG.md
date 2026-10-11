# Shared catalog and quantities

The active shopping, stock, scanner, and recipe ingredient flows use the catalog model in `src/app/domain/`. The older `items`, `todos`, `fridge_items`, and `ingredients` collections remain available only in the test database for pre-release compatibility tests; their screens are no longer routed. The app starts a fresh local RxDB store named `dbhotties-catalog-v1`; no old records are copied into it.

## Catalog

`catalog_nodes` is a single-parent tree. Internal `class` nodes represent substitutable categories; `product` leaves represent specific sellable products. There are Food and Household roots. A recipe ingredient may point to any Food descendant, including a leaf when a particular product matters. Matching a class accepts all descendant products. Cross-cutting traits can later use tags rather than giving a product multiple parents.

Products have fixed, variable, or unknown sale specifications. Fixed products store one package's measurable content in base units (`g`, `ml`, `piece`, `bunch`, or `pinch`); variable products store the sale unit. A new barcode's original package label is retained even when its content cannot be parsed. Unknown content is stocked as packages and cannot satisfy a measured recipe requirement until corrected.

## Usage records

- `recipe_ingredients` stores the recipe's target node and required amount independently of package size.
- `shopping_entries` stores an exact product, generic class, or free-text shopping need. Needs are measured quantity, exact-product package count, or unspecified. Checking an entry keeps it visible at the bottom. Existing task entries are removed by the v2 collection migration.
- `stock_lots` stores an acquired product, package count or bulk amount, remaining amount, expiry, and allocations to shopping entries. A lot may group packages with the same expiry. Remaining stock cannot exceed acquired stock.

Scanning adds one package to a lot and assigns its content to compatible entries in the active shopping list. Exact product matches win, then the deepest matching class, then checked entries. Allocations are stored on the lot. Partially fulfilled entries remain; completed entries are removed. A scan ID makes retries idempotent, and opening the shopping page reconciles completed entries after an interrupted removal.

Recipe availability sums remaining, unexpired compatible stock. A known same-unit quantity can be compared; an unknown package size or incompatible unit produces an unknown result if known stock is insufficient. No density or serving-size conversions are inferred. Exporting a recipe preserves its measured quantities; package suggestions are calculated only when a specific product is chosen.
