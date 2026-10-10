import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {createReadStream, createWriteStream} from 'node:fs';
import {mkdir, rename, rm, stat} from 'node:fs/promises';
import {pipeline} from 'node:stream/promises';

const root = '.model-cache/native';
const assets = [
  {
    file: `${root}/qwen2.5-0.5b-instruct-q4_k_m.gguf`,
    url: 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/9217f5db79a29953eb74d5343926648285ec7e67/qwen2.5-0.5b-instruct-q4_k_m.gguf',
    sha256: '74a4da8c9fdbcd15bd1f6d01d621410d31c6fc00986f5eb687824e7b93d7a9db'
  },
  {
    file: `${root}/llama.cpp-aa94f208.tar.gz`,
    url: 'https://codeload.github.com/ggml-org/llama.cpp/tar.gz/aa94f2086147cd4bfbcff818ce998dffce5fcb39',
    sha256: 'f2df238f09ecf19cf368b412fcbff86901f97ec867f1336fdf953cfd3e26930a'
  }
];

async function sha256(file) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}

await mkdir(root, {recursive: true});
for (const asset of assets) {
  let valid = false;
  try { valid = (await stat(asset.file)).isFile() && await sha256(asset.file) === asset.sha256; } catch { /* fetch below */ }
  if (!valid) {
    const response = await fetch(asset.url);
    if (!response.ok || !response.body) throw new Error(`Could not download ${asset.file}: HTTP ${response.status}`);
    const temp = `${asset.file}.download`;
    try {
      await pipeline(response.body, createWriteStream(temp));
      if (await sha256(temp) !== asset.sha256) throw new Error(`Checksum failed for ${asset.file}`);
      await rename(temp, asset.file);
    } catch (error) {
      await rm(temp, {force: true});
      throw error;
    }
  }
  console.log(`${asset.file}: ${asset.sha256}`);
}

const sourceDir = `${root}/llama.cpp`;
let extracted = false;
try { extracted = (await stat(`${sourceDir}/CMakeLists.txt`)).isFile(); } catch { /* extract below */ }
if (!extracted) {
  await rm(sourceDir, {recursive: true, force: true});
  await mkdir(sourceDir, {recursive: true});
  const extraction = spawnSync('tar', ['-xzf', assets[1].file, '-C', sourceDir, '--strip-components=1'], {stdio: 'inherit'});
  if (extraction.status !== 0) throw new Error('Could not extract pinned llama.cpp source.');
}
