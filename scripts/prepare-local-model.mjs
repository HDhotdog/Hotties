import {createHash} from 'node:crypto';
import {createReadStream, createWriteStream} from 'node:fs';
import {copyFile, mkdir, rename, rm, stat} from 'node:fs/promises';
import {pipeline} from 'node:stream/promises';
import path from 'node:path';

// Pin the exact model revision. Weights and tokenizer are validated before any
// build can package them; subsequent offline builds use the verified cache.
const revision = '2c4055b12046f11709e9df2c122e59ffbdc2f900';
const model = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';
const root = '.model-cache/models';
const files = new Map([
  ['config.json', '05b570bff786faa5c4604152aa16f19f77ed6dfc31e47dd0f3dd987078693ac7'],
  ['special_tokens_map.json', '06e405a36dfe4b9604f484f6a1e619af1a7f7d09e34a8555eb0b77b66318067f'],
  ['tokenizer_config.json', '3f5961b9ac86288cccdb97f32fb848d6187c78e1603958c53f3ea1f296b7d8a2'],
  ['tokenizer.json', 'b60b6b43406a48bf3638526314f3d232d97058bc93472ff2de930d43686fa441'],
  ['onnx/model_quantized.onnx', '66fc00f5f29afcaff34092e1bdd20008ca3918265a82fb9695a551e510cc4ebc'],
]);

async function sha256(file) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}

for (const [relative, expected] of files) {
  const target = path.join(root, model, relative);
  await mkdir(path.dirname(target), {recursive: true});
  let present = false;
  try { present = (await stat(target)).isFile(); } catch { /* download below */ }
  if (!present || (expected && await sha256(target) !== expected)) {
    const url = `https://huggingface.co/${model}/resolve/${revision}/${relative}`;
    const response = await fetch(url);
    if (!response.ok || !response.body) throw new Error(`Could not download ${relative}: HTTP ${response.status}`);
    const temp = `${target}.download`;
    try {
      await pipeline(response.body, createWriteStream(temp));
      if (expected && await sha256(temp) !== expected) throw new Error(`Checksum failed for ${relative}`);
      await rename(temp, target);
    } catch (error) {
      await rm(temp, {force: true});
      throw error;
    }
  }
  const actual = await sha256(target);
  if (expected && actual !== expected) throw new Error(`Checksum failed for cached ${relative}`);
  console.log(`${relative}: ${actual}`);
}

const wasmSource = 'node_modules/@huggingface/transformers/dist';
const wasmTarget = '.model-cache/wasm';
await mkdir(wasmTarget, {recursive: true});
for (const file of ['ort-wasm-simd-threaded.jsep.mjs', 'ort-wasm-simd-threaded.jsep.wasm']) {
  await copyFile(path.join(wasmSource, file), path.join(wasmTarget, file));
}
