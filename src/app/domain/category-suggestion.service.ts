import {Injectable} from '@angular/core';
import {CatalogNode} from './catalog.model';

export interface RankResult {
  id: number;
  ids?: string[];
  error?: string;
}

@Injectable({providedIn: 'root'})
export class CategorySuggestionService {
  private worker: Worker | null = null;
  private workerPromise: Promise<Worker> | null = null;
  private nextId = 0;
  private pending = new Map<number, {resolve: (value: string[]) => void; reject: (error: Error) => void}>();

  public warmUp(): void {
    void this.getOrInitWorker();
  }

  private getOrInitWorker(): Promise<Worker> {
    if (!this.workerPromise) {
      this.workerPromise = import('./category-suggestion.worker.factory').then(({createCategorySuggestionWorker}) => {
        const worker = createCategorySuggestionWorker();
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
    return this.requestRank('category', name, nodes);
  }

  public async rankProducts(name: string, nodes: CatalogNode[]): Promise<string[]> {
    return this.requestRank('product', name, nodes);
  }

  private async requestRank(kind: 'category' | 'product', name: string, nodes: CatalogNode[]): Promise<string[]> {
    if (!name.trim() || !nodes.length) return [];

    const worker = await this.getOrInitWorker();
    const id = ++this.nextId;
    return new Promise<string[]>((resolve, reject) => {
      this.pending.set(id, {resolve, reject});
      worker.postMessage({id, kind, name: name.trim(), nodes});
    });
  }
}
