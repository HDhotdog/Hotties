import {Injectable} from '@angular/core';
import {CatalogNode} from './catalog.model';
import {foodCategoryCandidates} from './category-candidates';

interface RankResult {id: number; ids?: string[]; error?: string}

@Injectable({providedIn: 'root'})
export class CategorySuggestionService {
  private worker: Worker | null = null;
  private workerPromise: Promise<Worker> | null = null;
  private nextId = 0;
  private pending = new Map<number, {resolve: (value: string[]) => void; reject: (error: Error) => void}>();

  public async rank(name: string, nodes: CatalogNode[]): Promise<string[]> {
    const candidates = foodCategoryCandidates(nodes);
    if (!candidates.length || !name.trim()) return [];
    const normalized = name.trim().toLocaleLowerCase('de-DE');
    const exact = candidates.find(candidate => candidate.labels[0].toLocaleLowerCase('de-DE') === normalized);
    if (exact) return [exact.id];

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
    const worker = await this.workerPromise;
    const id = ++this.nextId;
    return new Promise<string[]>((resolve, reject) => {
      this.pending.set(id, {resolve, reject});
      worker.postMessage({id, name: name.trim(), candidates});
    });
  }
}
