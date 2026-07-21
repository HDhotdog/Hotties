# Hotties

A personal offline-first mobile app for managing cooking recipes and a categorized shopping list. Built with **Ionic Angular** and packaged for Android/iOS with **Capacitor**.

> *"Hot cooking for hot people!"*

## Features

### Shopping List
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

The app opens at `http://localhost:8100` (Ionic default). All data is stored locally — no server or internet connection required.

## Building for Android

```bash
# Full pipeline: build → copy → sync → open Android Studio
npm run export
```

Or step by step:

```bash
ionic build
ionic cap copy
npx cap sync android
ionic cap open android
```

App ID: `io.ionic.hotties`

### App Icon

The Android app icon is generated from `resources/icon.png` via `@capacitor/assets`. The `android/` folder is gitignored, so the generated `mipmap-*` icons live only on your local machine — once generated, they persist across normal builds (`npm run export`, `npm run android:install`) since those only sync web assets, not icons.

You only need to regenerate the icon when:
- You change `resources/icon.png`, or
- The `android/` folder was deleted or freshly added (e.g. after a clean clone)

```bash
npx cap add android          # only if android/ doesn't exist yet
npx capacitor-assets generate --android
```

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
