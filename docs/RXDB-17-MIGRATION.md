# RxDB 16 → 17 Migration — Plan

## Context

The app is on **RxDB 16.21.1**, using `getRxStorageDexie` (production, browser IndexedDB via Dexie.js) and `getRxStorageMemory` (Jest specs only), wrapped in `wrappedValidateAjvStorage`, plus the `dev-mode` and `migration-schema` plugins. This was flagged as out-of-scope during the [Angular 20 migration](ANGULAR-20-MIGRATION.md) (PR [#4](https://github.com/HDhotdog/Hotties/pull/4)), since it's a breaking major version with its own migration guide.

## Research findings

Surveyed the RxDB 17.0.0–17.4.0 changelogs and release notes, and diffed this app's actual usage against them:

**Storage migration is NOT required for this app.** RxDB 17's storage-migrator is only mandatory for OPFS, the Node filesystem storage, and the *native* IndexedDB storage plugin when attachments are used. This app uses `storage-dexie` (a different plugin) and stores no attachments — existing users' browser IndexedDB data created under RxDB 16 should load directly under RxDB 17 with no explicit migration step. This is the biggest real-world risk of the whole upgrade (production user data), so it still needs to be verified manually against a browser profile with pre-existing data (see Phase 2), not just fresh test databases.

**Every plugin/function this app imports is unchanged in 17.4.0** (verified against the published package's type declarations, not just docs):
- `createRxDatabase`, `addRxPlugin`, `db.addCollections()` — same signatures
- `rxdb/plugins/dev-mode` → `RxDBDevModePlugin` — present
- `rxdb/plugins/validate-ajv` → `wrappedValidateAjvStorage({ storage })` — same signature
- `rxdb/plugins/storage-dexie` → `getRxStorageDexie(settings?)` — present
- `rxdb/plugins/storage-memory` → `getRxStorageMemory(settings?)` — present
- `rxdb/plugins/migration-schema` → `RxDBMigrationSchemaPlugin`, `collection.migrationNeeded()`, `collection.getMigrationState().migratePromise()` — all present and unchanged

**Other 17.x changes checked against this codebase — none apply:**
- `NON_PREMIUM_COLLECTION_LIMIT` dropped from 16 → 13 collections. This app defines 8 (`settings`, `categories`, `suggestions`, `todos`, `recipes`, `labels`, `label_groups`, `ingredients`) — no issue.
- A Dexie-storage fix/restriction around "optional index fields" — none of this app's schemas declare an explicit `indexes` array, so it's unaffected either way.
- `toggleOnDocumentVisible` default flip, attachment/CRDT/replication/encryption/leader-election fixes throughout 17.1–17.4 — none of these features are used anywhere in `src/app/database/`.
- Peer dependencies: `rxjs: ^7.8.2` matches what's installed; `@angular/core`, `firebase`, `mongodb`, `nats`, `react`, `vue` are all optional peers and none are installed — no conflict. `engines.node >= 18` is already satisfied.

**Drive-by finding (not part of this migration):** `pouchdb-adapter-idb` is listed in `package.json` but not imported anywhere in `src/` — looks like leftover cruft from before the app switched to `storage-dexie`. Flagging it rather than removing it here, since it's unrelated to the RxDB version bump.

## Plan

| Phase | Area | Notes |
|-------|------|-------|
| 0 | Baseline | Confirm `master` is green (`ng build`, `ng lint`, `npx jest`) before touching anything |
| 1 | Bump `rxdb` | `rxdb@^16.20.0` → `^17.4.0` in `package.json`, `npm install`, resolve any type errors from the compiler |
| 2 | Automated verification | `npx ng build`, `npx ng lint`, `npx jest` (exercises `storage-memory`, not `storage-dexie` — doesn't prove production storage compatibility by itself) |
| 3 | **Manual production-storage verification** | In a browser preview: (a) load the app fresh, confirm seed data and full todo/recipe/category/label CRUD still work end-to-end; (b) **critical** — reuse a browser profile/IndexedDB database that already has data written by the current RxDB 16 build (don't wipe storage first), reload against the RxDB 17 build, and confirm it opens with no Dexie/schema errors and all existing data is intact and queryable |
| 4 | Final validation & docs | Re-run full lint/test/build, update this doc's status, commit |

## Rollback

Single-commit change (`rxdb` version bump plus whatever type fixes surface) — `git revert` if Phase 3's manual check turns up data-loss or load failures against pre-existing IndexedDB data.

## Out of scope

| Item | Why deferred |
|------|--------------|
| Removing `pouchdb-adapter-idb` | Unused but unrelated to this bump; separate cleanup |
| Adopting new 17.x features (React hooks, replication plugins, attachment compression, etc.) | Nothing in this app currently needs them |
