# Angular 20 Migration — Status & Plan

## Context

The app is on **Angular 19.2.0** with the legacy webpack `browser`/`dev-server` builders, a mix of standalone components and leftover `NgModule`s (`recipe`, `settings`, `tabs`, `todo`), and no usage of the new `@if`/`@for`/`@switch` control-flow syntax (8 templates still use `*ngIf`/`*ngFor`/`*ngSwitch`). This migration brings the framework and its closest dependents (CDK, Material, Ionic) to Angular 20, moves the build to the esbuild `application` builder, and cleans up the deprecated patterns along the way.

**Important:** `@angular/cdk`/`@angular/material` must stay on the `20.2.x` line, not the `22.x` "latest" — that requires Angular 22/23 and is out of scope here. Two other major bumps surfaced during dependency review — **RxDB 16 → 17** and **Capacitor 7 → 8** — are intentionally **out of scope** for this migration and tracked as separate follow-up work; both are breaking changes with their own migration guides and native-project implications.

## Migration Timeline (Git History)

| Commit | Milestone |
|--------|-----------|
| _pending_ | Phase 0 — baseline captured, `uuid` semver typo fixed |
| _pending_ | Phase 1 — Angular 19 patch catch-up (19.2.0 → 19.2.25/27) |
| _pending_ | Phase 2 — Angular 20 core, CDK/Material 20, esbuild `application` builder |
| _pending_ | Phase 3 — Ionic/ionicons bump |
| _pending_ | Phase 4 — Standalone conversion, `CUSTOM_ELEMENTS_SCHEMA` cleanup, control-flow migration |
| _pending_ | Phase 5 — Dev tooling bumps (eslint, typescript-eslint, jest) |
| _pending_ | Phase 6 — Final validation |

## Current Progress: 0%

### Plan

| Phase | Area | Status | Notes |
|-------|------|--------|-------|
| 0 | Baseline snapshot | ⏳ Pending | `git status` clean check, baseline lint/test/build run, fix `"uuid": "^11.1.0 "` trailing-space bug |
| 1 | Angular 19 patch catch-up | ⏳ Pending | `@angular/*` → `19.2.25`, `@angular/cli`/`build-angular` → `19.2.27`, `@angular-eslint/*` → `19.8.1`, `zone.js` → `0.15.1` |
| 2 | Angular 20 core migration | ⏳ Pending | `ng update @angular/core@20 @angular/cli@20`, then `ng update @angular/cdk@20 @angular/material@20`; migrate `angular.json` from `browser`/`dev-server` builders to `application`; bump `typescript` to the range Angular 20 requires |
| 3 | Ionic / ionicons bump | ⏳ Pending | `@ionic/angular` → `8.8.14`, `@ionic/angular-toolkit` → `12.3.0`, `@ionic/cordova-builders` → `12.3.0`, `@ionic/pwa-elements` → `3.4.0`, `ionicons` → `8.0.13` (check renamed icon imports) |
| 4 | Deprecation cleanup | ⏳ Pending | Convert `recipe`/`settings`/`tabs`/`todo` `NgModule`s to standalone; drop `CUSTOM_ELEMENTS_SCHEMA` where no longer needed; run `ng generate @angular/core:control-flow` for the 8 remaining `*ngIf`/`*ngFor`/`*ngSwitch` templates |
| 5 | Dev tooling bumps | ⏳ Pending | `@typescript-eslint/*` → `8.64.0`, `eslint` → `9.39.5`, `eslint-plugin-jsdoc` held at `50.8.0`, `jest`/`jest-preset-angular` compatibility check, `uuid` → `11.1.1`, `ngx-image-compress` → `18.1.7`, `@ctrl/ngx-emoji-mart` → `9.3.0` |
| 6 | Final validation | ⏳ Pending | Full lint/test/prod build, browser smoke test of todo/recipe/settings/tabs flows |

### Out of scope (separate follow-up PRs)

| Item | Why deferred |
|------|--------------|
| RxDB 16.20.0 → 17.4.0 | Major, breaking change with its own migration guide; needs isolated testing pass |
| Capacitor 7.x → 8.x | Major bump requiring native Android/iOS re-sync and plugin API verification (`app`, `camera`, `filesystem`, `haptics`, `keyboard`, `status-bar`) |
| Zoneless change detection | Optional future work; needs full-app testing before adoption |

## Rollback

Each phase is a self-contained commit. If a phase breaks the build or test suite, `git revert` that phase's commit and re-assess before continuing — later phases assume earlier ones are green.
