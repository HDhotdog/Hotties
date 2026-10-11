[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC_BY--NC--SA_4.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)
# Hotties

A personal offline-first mobile app for managing cooking recipes and a categorized shopping list. Built with **Ionic Angular** and packaged for Android/iOS with **Capacitor**.

Shopping, recipes, scanning, and stock now share a [catalog tree and quantity model](docs/SHARED-CATALOG.md): generic categories such as milk can match specific barcode products, while package sizes remain separate from recipe requirements.

> *"Hot cooking for hot people!"*

## Features

### Shopping List
- Create product or class needs with measured quantities, exact package counts, or no specified amount
- Quickly add food or household items by name and organize lists by store
- Check entries to strike them through and move them below active entries
- Scan purchased products after shopping; matching needs clear once their quantities are covered
- Keep partial needs visible and show package suggestions for a chosen product

### Fridge entry
- Add products by typing, barcode scanning, or German on-device speech on supported Android phones
- Review the recognized product and amount before adding stock
- Receive local category suggestions from a bundled multilingual embedding model; choose the category yourself

See [offline voice entry](docs/OFFLINE-VOICE-ENTRY.md) for device support and verification.

### Recipes
- Create, view, edit, and delete recipes
- Fields: name, description, preparation time, ingredients, labels
- Scrollable recipe list with search bar
- Filter by **label groups** (type, taste, custom) and preparation time
- Assign multiple labels from configurable groups
- Export recipe ingredients to the shopping list without changing measured amounts into package counts
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
| **Database** | RxDB 17 (Dexie/IndexedDB storage) |
| **Language** | TypeScript 6 |
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
├── domain/            # Catalog, quantities, shopping entries, stock lots, active screens
├── todo/              # Shopping routing and legacy model
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
- **[Shared Catalog](docs/SHARED-CATALOG.md)** — Current entity model and quantity rules
- **[RxDB Migration Plan](docs/RXDB-MIGRATION.md)** — Historical migration notes
- **[Roadmap](src/roadmap.md)** — Future features and technical debt
- **[App Summary](src/summary.md)** — Original feature overview

## Current State (October 2026)

The active shopping, stock, catalog, scanner, and recipe ingredient flows use RxDB with Dexie/IndexedDB storage. The new catalog starts in a fresh local database; old pre-release records are not copied. Legacy entity collections are present only in the test database, and their screens are no longer routed. See [Shared Catalog](docs/SHARED-CATALOG.md) for the current model.

## Design Principles

- **Offline-first** — No backend, all data stored on device
- **Local-only** — No account system or cloud sync
- **Customizable** — User-defined categories, label groups, and labels

## License

This project is licensed under the [CC BY-NC-SA 4.0](LICENSE) License.
