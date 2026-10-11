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

The Android APK contains no model weights, tokenizer, or ONNX WASM files.
In **Settings → Manage AI models**, the user can download or delete the optional
model. Android downloads the pinned files on Wi-Fi by default; using cellular
data requires confirmation for that download. Every file is checked against a
size and SHA-256 hash before the model becomes available. The manifest is in
`native/android/ai-model-manifest.json`. When installed, all category ranking
runs locally and works offline. The **Use AI suggestions** switch can disable
ranking without deleting the model; typed entry, speech, and manual category
selection continue to work. Web and iOS use manual selection for now.

For Android, run `npm run native:configure` before `npx cap sync android`.
The native project is generated and ignored by Git; configuration copies and
registers the tracked offline speech plugin and adds microphone permission.

## Verification on a phone

1. Install the APK, open **Manage AI models**, and download the model over Wi-Fi. Create a food category such as **Backwaren**, then switch to airplane mode.
2. Type `Brezel`, choose Backwaren, confirm, and check one piece in the fridge.
3. With a German on-device speech pack available, say `Eine Brezel`; correct the review if needed, confirm, and check one additional piece.
4. Try a different food name and quantity, a category with no product examples, microphone denial, and cancelled recognition.
5. Disable AI suggestions and verify no ranking runs; delete the model and verify manual selection still works.
6. Record cold model load, warm suggestion latency, memory, UI responsiveness, and APK size on the target phone. The build alone does not establish phone performance.
