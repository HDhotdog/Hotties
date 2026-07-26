# Localization Plan (ngx-translate)

## Goal
Replace all hardcoded English UI text with `@ngx-translate/core` translations. Ship English (`en`) and German (`de`) at launch, selectable from Settings, with the choice persisted (RxDB `settings` collection, same pattern as `selectedCategoryId`).

## Library choice
`@ngx-translate/core` (+ `@ngx-translate/http-loader`) — runtime language switching without rebuilding, unlike Angular's built-in `$localize`/i18n which is compile-time per-locale. Peer deps (`@angular/core >=18`, `rxjs >=7`) are satisfied by Angular 22.

## Architecture

- **Translation files**: `src/assets/i18n/en.json`, `src/assets/i18n/de.json`. Nested by feature: `common`, `tabs`, `settings`, `fridge`, `item`, `recipe`, `todo`, `units`.
- **Loading**: `TranslateHttpLoader` reading `./assets/i18n/{lang}.json` (already-bundled Ionic assets, works offline in Capacitor since files ship in the app bundle).
- **Bootstrap** (`main.ts`): add `provideHttpClient()` and `importProvidersFrom(TranslateModule.forRoot({ loader: {...} }))`. Use `provideAppInitializer` to load the persisted language (or browser default) before first render, avoiding a flash of English.
- **LanguageService** (`src/app/settings/language/language.service.ts`): wraps `TranslateService` + `SettingsRepository`/new `SettingsService.getLanguage()/setLanguage()`. Owns the supported-language list (`en`, `de`), default fallback (`en`), and persistence key `'language'`. Falls back to `navigator.language` on first run if no persisted value.
- **Language setting UI**: new `settings/language-setting/` component (mirrors `label-setting`/`category-setting` structure) with a radio list of supported languages; wired into `settings-routing.module.ts` and linked from `settings.component.html`.

## Handling special cases

- **`AmountUnit` enum values are persisted data** (`Stück`, `Pck`, `g`, `kg`, ...) — do **not** translate the enum values themselves (would corrupt stored/compared data). Instead add a `unitTranslationKey(unit: AmountUnit): string` lookup (or a small pipe) mapping each enum member to an `units.*` translation key, used everywhere a unit is displayed.
- **Manual pluralization** (expiry days in `fridge.component.ts`, ingredient count in `recipe.component.html`) — ngx-translate has no built-in ICU plural support. Keep the existing "pick the right key in code" pattern but resolve the picked key through `TranslateService` (e.g. separate `fridge.expiryToday` / `fridge.expiryInDays` / `fridge.expiredDaysAgo` keys with `{days}` param), rather than building the English string directly.
- **Interpolated strings** (`Ingredients added to {{category}}`, `Add Label to {{group.name}}`, `Version: {{version}} ({{commitHash}})`, `{{hours}}h {{minutes}}m`) — use ngx-translate's `{param}` interpolation via the pipe (`'recipe.exportedTo' | translate:{category: name}`) or `TranslateService.instant(key, params)` in `.ts` code paths (toasts/alerts).
- **Currency (`EUR`) and date formatting** are locale/formatting concerns, not translation — out of scope for this pass, left as-is.

## Implementation phases

1. **Infra**: install `@ngx-translate/core` + `@ngx-translate/http-loader`, create `assets/i18n/en.json`/`de.json` skeleton, wire `main.ts`, build `LanguageService` + `SettingsService` language methods.
2. **Language setting UI**: `language-setting` component + route + entry point in Settings page.
3. **Templates**: convert every hardcoded string in the ~15 templates (tabs, settings + subpages, fridge, item, recipe, todo) to `{{ 'key' | translate }}` / `translate` attribute directives, adding matching `en.json` keys as source of truth.
4. **Component code**: replace hardcoded strings in `.ts` files (toasts, alerts, fallback error messages, the `expiryLabel()`/`prepTimeLabel` builders) with `TranslateService` lookups.
5. **Units**: add the `AmountUnit` → translation-key lookup and use it everywhere units are rendered.
6. **German translations**: fill in `de.json` for every key added in phases 3–5.
7. **Test fixes**: add `TranslateModule.forRoot()` (with a no-op/fake loader) to every component spec's `TestBed` config that renders a template touched above, so existing Jest specs keep passing.
8. **Manual QA**: run the app in the browser preview, switch language in Settings, spot-check each tab for missed strings and layout issues (German text is often longer).

## Out of scope
- Compile-time `$localize` i18n, additional languages beyond en/de (architecture supports adding more later by dropping in another JSON file), RTL layout, currency/date locale formatting.
