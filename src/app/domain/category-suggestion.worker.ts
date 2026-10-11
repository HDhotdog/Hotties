import {env, pipeline} from '@huggingface/transformers';

let extractor: any = null;
let configured = false;
let cachedEmbeddings: Array<{ categoryId: string; embedding: number[] }> = [];
let lastNodeCount = 0;

async function getExtractor() {
  if (!configured) throw new Error('AI model is not configured.');
  if (!extractor) {
    extractor = await pipeline('feature-extraction', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2',
      {dtype: 'q8', local_files_only: true});
  }
  return extractor;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

self.onmessage = async (event: MessageEvent) => {
  if (event.data.kind === 'configure') {
    const baseUrl = String(event.data.baseUrl).replace(/\/$/, '');
    env.allowRemoteModels = false;
    env.allowLocalModels = true;
    env.useBrowserCache = false;
    env.localModelPath = `${baseUrl}/models/`;
    env.backends.onnx.wasm.wasmPaths = {
      mjs: `${baseUrl}/wasm/ort-wasm-simd-threaded.jsep.mjs`,
      wasm: `${baseUrl}/wasm/ort-wasm-simd-threaded.jsep.wasm`
    };
    configured = true;
    return;
  }
  const {id, name, nodes} = event.data;

  try {
    if (!nodes || !Array.isArray(nodes) || !name.trim()) {
      self.postMessage({id, ids: []});
      return;
    }

    const model = await getExtractor();
    // 1. Extract product nodes that have a parent category (parentId)
    const productNodes = nodes.filter((n: any) => n.kind === 'product' && n.parentId);
    // 2. Re-embed catalog nodes only if the catalog size/items changed
    if (productNodes.length !== lastNodeCount || cachedEmbeddings.length === 0) {
      cachedEmbeddings = [];
      for (const node of productNodes) {
        const output = await model(node.name, {pooling: 'mean', normalize: true});
        cachedEmbeddings.push({
          categoryId: node.parentId,
          embedding: Array.from(output.data as Float32Array)
        });
      }
      lastNodeCount = productNodes.length;
    }

    if (cachedEmbeddings.length === 0) {
      self.postMessage({id, ids: []});
      return;
    }

    // 3. Generate embedding for the new input product
    const inputOutput = await model(name, {pooling: 'mean', normalize: true});
    const inputEmbedding = Array.from(inputOutput.data as Float32Array);

    // 4. Score against all catalog products using cosine similarity
    const scores = cachedEmbeddings.map(item => {
      const score = cosineSimilarity(inputEmbedding, item.embedding);
      return {categoryId: item.categoryId, score};
    });

    scores.sort((a, b) => b.score - a.score);

    // 5. Extract top 3 unique category IDs
    const topCategoryIds: string[] = [];
    for (const match of scores) {
      if (match.categoryId && !topCategoryIds.includes(match.categoryId)) {
        topCategoryIds.push(match.categoryId);
      }
      if (topCategoryIds.length >= 3) break;
    }

    self.postMessage({id, ids: topCategoryIds});

  } catch (error: any) {
    self.postMessage({id, error: error?.message || 'Embedding ranking error'});
  }
};
