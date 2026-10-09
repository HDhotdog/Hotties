# Hotties

A personal offline-first mobile app for managing cooking recipes and a categorized shopping list. Built with **Ionic Angular** and packaged for Android/iOS with **Capacitor**.

> *"Hot cooking for hot people!"*

## Features

### Shopping List
- Scan a food barcode from the shopping list to add its product to the fridge (installed mobile app; internet required for uncached products)
- Create and manage shopping items per **category** (e.g. different supermarkets)
- Switch between categories with persistent selection
- Set item **priority/importance** with color-coded indicators (low → very high)
- Autocomplete **suggestions** per category with playful random placeholders
- Sort items alphabetically (ascending/descending)
- Clear all items or tap to complete (remove) individual items
- New typed items can be saved as future suggestions (per category setting)

### Recipes
- Create, view, edit, and delete recipes
- Fields: name, description, preparation time, ingredients, labels
- Scrollable recipe list with search bar
- Filter by **label groups** (type, taste, custom) and preparation time
- Assign multiple labels from configurable groups
- Export recipe ingredients to the shopping list
- Image upload and emoji picker (UI present; persistence in progress)

### Labels
- Two default groups seeded on first run: **Art** (meal type) and **Geschmack** (taste)
- Create custom label groups and labels in Settings
- Filter recipes by any combination of labels
- Labels linked to recipes via normalized database relations

### Settings
- **Categories** — Add, edit, delete, and reorder shopping list categories
- **Labels** — Manage label groups and individual labels
- **Cache** — Reset application data

## Tech Stack

| | |
|---|---|
| **Framework** | Angular 19, Ionic 8 |
| **Mobile** | Capacitor 7 (Android/iOS) |
| **Database** | RxDB 16 (localStorage adapter) |
| **Language** | TypeScript 5.7 |
| **UI** | Ionic components, Angular Material (partial), SCSS |
| **Testing** | Jasmine + Karma |
| **Linting** | ESLint 9 |

## Prerequisites

- Node.js (LTS recommended)
- npm
- For Android builds: Android Studio, JDK
- Ionic CLI: `npm install -g @ionic/cli`

## Getting Started

```bash
# Install dependencies
npm install

# Run in browser (development)
npm start

# Run tests
npm test

# Lint
npm run lint
```

The app opens at `http://localhost:8100` (Ionic default). All data is stored locally. An internet connection is needed to look up a new scanned barcode in Open Food Facts.

## Building for Android

On a fresh checkout, create the native project with `npx cap add android` first. The barcode scanner needs Android min SDK 26; `npm run export` configures the generated native project before syncing it. See [barcode scanning setup](docs/BARCODE-SCANNING.md).

```bash
# Full pipeline: build → copy → sync → open Android Studio
npm run export
```

Or step by step:

```bash
npm run build
npm run native:configure
npm run native:assets
ionic cap copy
npx cap sync android
ionic cap open android
```

App ID: `io.ionic.hotties`

### Install on a connected Android phone (Linux)

Install the Android SDK and JDK 21, enable USB debugging on your phone, then run:

```bash
npm run android:install
```

The script builds the app and APK, then updates the app on the connected phone. It uses `ANDROID_HOME` or `ANDROID_SDK_ROOT` if set, otherwise `~/Android/Sdk`. Set `JAVA_HOME` if your default Java is not JDK 21. If more than one device is connected, set `ANDROID_SERIAL` to the target device ID shown by `adb devices`.

### App Icon

The Android app icon is generated from `resources/icon.png` via `@capacitor/assets`. The `android/` folder is gitignored, so the generated `mipmap-*` icons live only on your local machine. Both `npm run export` and `npm run android:install` now regenerate them before building.

If you build Android manually, regenerate assets after changing `resources/icon.png` or recreating the `android/` folder:

```bash
npx cap add android          # only if android/ doesn't exist yet
npm run native:assets
```

The `package.json` overrides keep `@capacitor/assets` on patched `sharp`, `tar`,
and `uuid` transitive releases while its published dependencies still pin older
versions. Recheck these overrides when `@capacitor/assets` updates.

## Project Structure

```
src/app/
├── database/          # RxDB setup, schemas, base repository
├── todo/              # Shopping list
├── recipe/            # Recipes (list, add/edit, detail)
├── category/          # Shopping categories
├── label/             # Labels and label groups
├── ingredients/       # Recipe ingredients
├── settings/          # Settings screens
└── tabs/              # Main navigation shell

docs/
├── TECHNICAL.md       # Architecture & data model reference
└── RXDB-MIGRATION.md  # Migration status & completion plan
```

## Documentation

- **[Technical Documentation](docs/TECHNICAL.md)** — Architecture, data model, routing, build instructions, known issues
- **[RxDB Migration Plan](docs/RXDB-MIGRATION.md)** — Current migration status (~75%) and step-by-step plan to finish
- **[Roadmap](src/roadmap.md)** — Future features and technical debt
- **[App Summary](src/summary.md)** — Original feature overview

## Current State (July 2026)

The app is mid-migration from **Capacitor Preferences** (JSON key-value storage) to **RxDB** (reactive local database). Capacitor itself remains for native mobile features.

**What works:**
- RxDB database with 8 normalized collections
- Shopping list CRUD with categories and suggestions
- Basic recipe CRUD
- Label and label group management (database layer)

**What needs finishing:**
- Label TypeScript models accidentally broken in uncommitted changes
- Recipe filtering, label display, and label settings UI have bugs
- Ingredients not persisted when saving recipes
- Recipe → shopping list export not wired
- Legacy storage cleanup (`@ionic/storage`, Capacitor Preferences)
- IndexedDB adapter for production (localStorage has size limits)

See [docs/RXDB-MIGRATION.md](docs/RXDB-MIGRATION.md) for the full plan.

## Design Principles

- **Offline-first** — No backend, all data stored on device
- **Local-only** — No account system or cloud sync
- **Customizable** — User-defined categories, label groups, and labels

## License

Private personal project.
