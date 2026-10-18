# Localization

The app starts in English (`en-GB`). Settings → Language changes the whole app immediately and saves the language in the RxDB `settings` collection under `language`. German uses `de-DE`. A welcome screen and automatic device-language selection are intentionally deferred.

## Add a language

1. Copy `src/assets/i18n/en.json` to a file named for the new language code, such as `fr.json`.
2. Set `meta.code` to the filename without `.json`, `nativeName` to the language's own name, `locale` to a canonical BCP 47 locale, `direction` to `ltr` or `rtl`, and `firstDayOfWeek` to 0 (Sunday) through 6 (Saturday).
3. Translate every value under `messages`. Keep keys and parameter names unchanged. Each message is a complete sentence or label; translators can change word order. ICU plural messages must include `other` and can use the plural categories required by the language.
4. Translate the input vocabulary: `countWords` maps spoken whole-number words to their numeric values, `uncertainPrefixes` lists phrases that require the user to confirm a quantity, `pieceWords` contains optional piece-unit words, and `nameSuffixes` defines conservative suffix replacements used only to match existing product names. These are language data, not application code. Recognized numeric counts work without number-word vocabulary. Product names are never automatically translated.
5. Run `npm run i18n:generate`, `npm run i18n:test`, and `npm test`. Restart `npm start` if it was already running when the file was added.

No component, language union, or language list needs changing. The generator discovers all packs and creates an ignored TypeScript registry. Normal start, watch, build, and test scripts generate it automatically. Assets and the registry are bundled with the app, so translation and switching work offline. Shipping a new language requires rebuilding the app.

`npm run i18n:check` validates matching keys, nonempty values, metadata, ICU syntax, and matching parameter names. It also checks source references and rejects hard-coded visible HTML text and accessibility labels. `npm run i18n:test` checks the validator and proves a temporary third pack is registered automatically. CI runs both checks.

## Add or change UI text

- Add a descriptive stable key to every pack. Do not use translated text as a database identifier or compare translated strings.
- Templates use the shared `LocalizationService`: `i18n.t('ui.save')`, `i18n.quantity(amount, unit)`, `i18n.date(isoDate)`, and `i18n.name(record)`.
- Keep message state as a translation key or `message(key, parameters)` rather than storing the result of `t()`. Existing errors and status messages then change when the language changes. Translate imperative dialogs at presentation time.
- Domain validation throws `AppError(translationKey, englishDiagnostic, parameters)`. UI code passes errors through `i18n.error(error)`. Unknown exceptions are logged and receive a localized generic message. Native plugins use stable error codes; add their presentation mapping in the localization service.
- Keep canonical numeric values and unit codes in storage. Native decimal fields use `appLocalizedNumber`; a comma or point is accepted as a decimal separator, grouping separators are not accepted. Expiry dates use `app-localized-date`, backed by Ionic's locale-configurable date picker. Its scoped `appLocalizedDatetime` adapter translates Ionic's otherwise hard-coded calendar accessibility labels and must be checked when upgrading Ionic. ISO date-only strings are formatted without timezone shifts.
- Language metadata supplies document language/direction. New layouts should use logical CSS properties so they also accommodate right-to-left text. Review each new language visually; text length and script can affect layout.

## Built-in names and existing data

New starter label groups, labels and catalog roots carry `origin: "app"` and `translationKey`. New user records carry `origin: "user"`. Only app-provided records with a translation key have translated names. Names resolve at display time; stored canonical names, IDs and recipe relationships stay intact. A real rename clears the key but retains the origin attribute. Renaming a label definition updates its recipe copies and clears their keys too. Opening or cancelling an editor does not change metadata.

Existing unmarked labels remain as written because their original random IDs cannot reliably distinguish starter data from custom data. Existing unmarked catalog roots are also preserved; migrations do not infer provenance from names. Custom recipe text, products, brands, shopping-list names and renamed defaults remain verbatim.

## Android

Offline speech receives the selected locale. Availability is checked on-device; Android 13+ also checks whether that language is installed, allowing a compatible regional variant (for example, installed `en-US` for the English UI). Earlier Android versions may report a missing speech language only when recognition starts. Missing recognition support or microphone permission never prevents typing. Language changes cancel current recognition and ignore results from the previous language. No speech model is downloaded automatically.

Scanner instructions and accessibility labels are passed from the pack. AI download notification title/description are passed when starting or checking a download, synchronized when the language changes, and persisted natively, so subsequent files use that language even if the app process closes. An already queued OS notification retains the language used when it was created. OS-owned permission dialogs use the device language.

Native sources are maintained in `native/android`, then copied into the generated Android project by `npm run native:configure`. Validate with the web build, `npx cap sync android`, and the Android debug build. Recognition, permission dialogs, and actual download notifications also require a connected device for end-to-end verification.
