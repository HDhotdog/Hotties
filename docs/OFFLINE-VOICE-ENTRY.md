# German voice entry and local category suggestions

## Shopping sentences

The shopping page accepts a whole German sentence by voice on supported Android
phones, or by typing. An on-device Qwen 2.5 0.5B Instruct decoder extracts up to
12 editable `{name, amount, unit}` rows. The existing MiniLM encoder ranks local
catalog products for each row. Only a unique exact name match is preselected;
other product matches are suggestions. The user can choose a product or class,
or create a class for an unmatched item, before confirming the whole list.

The decoder is bundled as a 4-bit GGUF model (about 491 MB) alongside the
existing encoder. Its revision and SHA-256, and the pinned `llama.cpp` source,
are checked by `scripts/prepare-native-llm.mjs` during Android configuration.
The encoder and its WASM runtime load only packaged assets. Parsing and matching
never send speech text or catalog names to a remote service. The decoder runs
through a native Android plugin because the phone's WebView WebGPU storage
buffer limit is too small for Qwen's ONNX graph. The review keeps the raw
transcription so the user can correct model mistakes.
The model is Apache-2.0 licensed; its upstream model card is
https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct.

Before confirming, a kilogram is converted to 1000 stored grams, a spoken
`Packung` becomes a package count, and a count without a unit (such as three
tomatoes) becomes pieces. Package counts can target a class and are fulfilled
when a matching product is received into stock. A partially interrupted save
can be retried without duplicating rows.

The microphone uses Android's on-device `SpeechRecognizer` with `de-DE`.
It is offered only when Android API 31+ reports an on-device recognizer. No
cloud speech fallback is used. When recognition or microphone permission is
unavailable, type the sentence instead. The browser and iOS builds can review
manually entered rows, but cannot run the bundled Android decoder.

Both voice and typed sentences open the same editable review. An existing
catalog product is reused only after a unique exact match or the user's choice.
Unmatched items require an explicit class choice. The app does not silently
assign a catalog item.

Category suggestions use `@huggingface/transformers` in a web worker and the
quantized `Xenova/paraphrase-multilingual-MiniLM-L12-v2` sentence embedding
model. It compares a product name with existing food category names and up to
six product names already assigned to each category. These are suggestions,
not classifications guaranteed to be correct. Newly selected products enrich
future suggestions. The base model is Apache-2.0 licensed.

`npm run build` downloads a pinned model revision into the ignored
`.model-cache/` directory, verifies SHA-256 hashes, and bundles the weights,
tokenizer, and ONNX WASM runtime with the app. A verified cache supports later
offline builds. At runtime, remote model loading is disabled; product names and
embeddings remain on the device. Only a build-time model download needs a
network connection.

For Android, run `npm run native:configure` before `npx cap sync android`.
The native project is generated and ignored by Git; configuration copies and
registers both tracked plugins, bundles the verified GGUF, compiles llama.cpp,
and adds microphone permission.

## Verification on a phone

1. Install the APK and switch to airplane mode.
2. On the shopping page, type `Ein Kilo Kartoffeln, eine Packung Eier, 3 Tomaten` and review all three rows.
3. Choose catalog targets or create classes, confirm, and check the stored amounts and units.
4. With a German on-device speech pack available, speak the same sentence and correct the transcription or rows if needed.
5. Try ambiguous products, malformed output, microphone denial, cancellation, and retrying after a partial save.
6. Record cold model load, warm transcription-to-review latency, memory, UI responsiveness, and APK size on the target phone.
