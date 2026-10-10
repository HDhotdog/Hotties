import {env, pipeline} from '@huggingface/transformers';

interface Candidate { id: string; labels: string[] }
interface RankRequest { id: number; name: string; candidates: Candidate[] }

const modelName = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';
env.allowLocalModels = true;
env.allowRemoteModels = false;
env.localModelPath = `${self.location.origin}/assets/models/`;
env.backends.onnx.wasm.wasmPaths = `${self.location.origin}/assets/wasm/`;
env.backends.onnx.wasm.numThreads = 1;

const embeddings = new Map<string, number[]>();
let extractorPromise: ReturnType<typeof pipeline> | null = null;

async function embed(text: string): Promise<number[]> {
  const cached = embeddings.get(text);
  if (cached) return cached;
  extractorPromise ??= pipeline('feature-extraction', modelName, {dtype: 'q8', device: 'wasm'});
  const extractor = await extractorPromise;
  const output = await extractor(text, {pooling: 'mean', normalize: true});
  const vector = Array.from(output.data as Float32Array);
  embeddings.set(text, vector);
  return vector;
}

function dot(a: number[], b: number[]): number {
  return a.reduce((sum, value, index) => sum + value * b[index], 0);
}

self.onmessage = async (event: MessageEvent<RankRequest>) => {
  const {id, name, candidates} = event.data;
  try {
    const query = await embed(name);
    const scores: {id: string; score: number}[] = [];
    for (const candidate of candidates) {
      let best = -1;
      for (const label of candidate.labels) best = Math.max(best, dot(query, await embed(label)));
      scores.push({id: candidate.id, score: best});
    }
    scores.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
    self.postMessage({id, ids: scores.slice(0, 3).map(item => item.id)});
  } catch (error) {
    // A failed model load is not retried until the next app session.
    extractorPromise = null;
    self.postMessage({id, error: String(error instanceof Error ? error.message : error)});
  }
};
