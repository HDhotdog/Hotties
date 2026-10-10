import {pipeline} from '@huggingface/transformers';
import {CatalogNode} from './catalog.model';
import {configureLocalModels} from './local-model-env';

configureLocalModels();

let extractor: any = null;
let extractorPromise: Promise<any> | null = null;
let catalogKey = '';
let cachedEmbeddings: Array<{productId: string; categoryId: string; embedding: Float32Array}> = [];
let work: Promise<void> = Promise.resolve();

async function getExtractor() {
  extractorPromise ??= pipeline('feature-extraction', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2')
    .catch(error => {
      extractorPromise = null;
      throw error;
    });
  extractor ??= await extractorPromise;
  return extractor;
}

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let score = 0;
  for (let i = 0; i < a.length; i++) score += a[i] * b[i];
  return score; // Both vectors are normalized by the embedding pipeline.
}

async function rank({id, kind, name, nodes}: {id: number; kind: 'category' | 'product'; name: string; nodes: CatalogNode[]}): Promise<void> {
  try {
    if (!Array.isArray(nodes) || !name?.trim()) {
      self.postMessage({id, ids: []});
      return;
    }
    const products = nodes.filter(node => node.kind === 'product' && node.parentId);
    if (!products.length) {
      self.postMessage({id, ids: []});
      return;
    }
    const key = JSON.stringify(products.map(node => [node.id, node.name, node.brand, node.parentId]));
    const model = await getExtractor();
    if (key !== catalogKey) {
      const embeddings = [];
      for (const node of products) {
        const output = await model(`${node.name} ${node.brand ?? ''}`.trim(), {pooling: 'mean', normalize: true});
        embeddings.push({productId: node.id, categoryId: node.parentId!, embedding: output.data as Float32Array});
      }
      cachedEmbeddings = embeddings;
      catalogKey = key;
    }
    const input = await model(name, {pooling: 'mean', normalize: true});
    const scores = cachedEmbeddings.map(item => ({...item, score: cosineSimilarity(input.data as Float32Array, item.embedding)}));
    scores.sort((a, b) => b.score - a.score);
    const ids: string[] = [];
    for (const item of scores) {
      const candidate = kind === 'product' ? item.productId : item.categoryId;
      if (!ids.includes(candidate)) ids.push(candidate);
      if (ids.length >= (kind === 'product' ? 5 : 3)) break;
    }
    self.postMessage({id, ids});
  } catch (error) {
    self.postMessage({id, error: error instanceof Error ? error.message : 'Embedding ranking error'});
  }
}

self.onmessage = ({data}: MessageEvent<{id: number; kind: 'category' | 'product'; name: string; nodes: CatalogNode[]}>) => {
  work = work.then(() => rank(data));
};
