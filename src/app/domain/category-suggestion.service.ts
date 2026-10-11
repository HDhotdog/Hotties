import {inject, Injectable} from '@angular/core';
import {CatalogNode} from './catalog.model';
import {AiModelService} from './ai-model.service';

export interface RankResult {
  id: number;
  ids?: string[];
  error?: string;
}

@Injectable({providedIn: 'root'})
export class CategorySuggestionService {
  private readonly model = inject(AiModelService);
  private worker: Worker | null = null;
  private workerPromise: Promise<Worker> | null = null;
  private nextId = 0;
  private generation = 0;
  private pending = new Map<number, {resolve: (value: string[]) => void; reject: (error: Error) => void}>();

  constructor() {
    this.model.enabledChanged.subscribe(enabled => {
      if (!enabled) this.stop();
    });
  }

  public stop(): void {
    this.generation++;
    this.worker?.terminate();
    this.worker = null;
    this.workerPromise = null;
    for (const pending of this.pending.values()) pending.resolve([]);
    this.pending.clear();
  }

  public async availability(): Promise<{enabled: boolean; ready: boolean}> {
    const enabled = await this.model.enabled();
    if (!enabled) return {enabled, ready: false};
    const ready = (await this.model.status()).state === 'ready';
    return {enabled, ready};
  }

  private getOrInitWorker(baseUrl: string): Promise<Worker> {
    if (!this.workerPromise) {
      const generation = this.generation;
      this.workerPromise = import('./category-suggestion.worker.factory').then(({createCategorySuggestionWorker}) => {
        if (generation !== this.generation) throw new Error('AI suggestions were disabled.');
        const worker = createCategorySuggestionWorker();
        worker.postMessage({kind: 'configure', baseUrl});
        this.worker = worker;
        worker.onmessage = ({data}: MessageEvent<RankResult>) => {
          const pending = this.pending.get(data.id);
          if (!pending) return;
          this.pending.delete(data.id);
          if (data.error) pending.reject(new Error(data.error));
          else pending.resolve(data.ids ?? []);
        };
        worker.onerror = () => {
          for (const pending of this.pending.values()) pending.reject(new Error('Local category model is unavailable.'));
          this.pending.clear();
          worker.terminate();
          this.worker = null;
          this.workerPromise = null;
        };
        return worker;
      }).catch(error => {
        this.workerPromise = null;
        throw error;
      });
    }
    return this.workerPromise;
  }

  public async rank(name: string, nodes: CatalogNode[]): Promise<string[]> {
    if (!name.trim() || !nodes.length) return [];
    if (!(await this.model.enabled())) return [];
    const baseUrl = await this.model.installedBaseUrl();
    if (!baseUrl || !(await this.model.enabled())) return [];
    let worker: Worker;
    try {
      worker = await this.getOrInitWorker(baseUrl);
    } catch (error) {
      if (!(await this.model.enabled())) return [];
      throw error;
    }
    if (!(await this.model.enabled())) return [];
    const id = ++this.nextId;
    return new Promise<string[]>((resolve, reject) => {
      this.pending.set(id, {resolve, reject});
      // Pass the raw nodes array directly; the worker handles filtering and embedding
      worker.postMessage({id, name: name.trim(), nodes});
    });
  }
}
