# German voice entry and local category suggestions

The fridge microphone uses Android's on-device `SpeechRecognizer` with `de-DE`.
It is offered only when Android API 31+ reports an on-device recognizer. No
cloud speech fallback is used. When recognition or microphone permission is
unavailable, type the product instead. The browser and iOS builds have typed
entry only for now.

Both voice and typed entries open the same editable review. A bare name means
one item; simple German count words and digits are accepted. An existing
catalog product is reused. New countable products are recorded as one piece
each under a food category selected by the user. Products sold by weight
require a measured amount. The app does not infer expiry dates or silently
assign a category.

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
registers the tracked offline speech plugin and adds microphone permission.

## Verification on a phone

1. Create a food category such as **Backwaren**. Install the APK and switch to airplane mode.
2. Type `Brezel`, choose Backwaren, confirm, and check one piece in the fridge.
3. With a German on-device speech pack available, say `Eine Brezel`; correct the review if needed, confirm, and check one additional piece.
4. Try a different food name and quantity, a category with no product examples, microphone denial, and cancelled recognition.
5. Record cold model load, warm suggestion latency, memory, UI responsiveness, and APK size on the target phone. The build alone does not establish phone performance.
