import {TestBed} from '@angular/core/testing';
import {Subject} from 'rxjs';
import {AiModelService} from './ai-model.service';
import {blankClass} from './catalog.model';
import {CategorySuggestionService} from './category-suggestion.service';
import {createCategorySuggestionWorker} from './category-suggestion.worker.factory';

jest.mock('./category-suggestion.worker.factory', () => ({createCategorySuggestionWorker: jest.fn()}));

describe('CategorySuggestionService model gate', () => {
  const nodes = [blankClass('food', 'Food', 'root-food')];
  let model: {enabled: jest.Mock; installedBaseUrl: jest.Mock; status: jest.Mock; enabledChanged: Subject<boolean>};
  let service: CategorySuggestionService;
  let worker: {postMessage: jest.Mock; terminate: jest.Mock; onmessage: unknown; onerror: unknown};

  beforeEach(() => {
    model = {
      enabled: jest.fn().mockResolvedValue(true),
      installedBaseUrl: jest.fn().mockResolvedValue(null),
      status: jest.fn().mockResolvedValue({state: 'missing'}),
      enabledChanged: new Subject<boolean>()
    };
    worker = {postMessage: jest.fn(), terminate: jest.fn(), onmessage: null, onerror: null};
    (createCategorySuggestionWorker as jest.Mock).mockReturnValue(worker);
    TestBed.configureTestingModule({providers: [{provide: AiModelService, useValue: model}]});
    service = TestBed.inject(CategorySuggestionService);
  });

  it('never creates a worker when AI is disabled or its model is missing', async () => {
    model.enabled.mockResolvedValue(false);
    expect(await service.rank('Brezel', nodes)).toEqual([]);
    expect(model.installedBaseUrl).not.toHaveBeenCalled();
    model.enabled.mockResolvedValue(true);
    expect(await service.rank('Brezel', nodes)).toEqual([]);
    expect(createCategorySuggestionWorker).not.toHaveBeenCalled();
    expect(await service.availability()).toEqual({enabled: true, ready: false});
  });

  it('stops a pending worker request when AI is turned off', async () => {
    model.installedBaseUrl.mockResolvedValue('https://localhost/_capacitor_file_/model');
    const ranking = service.rank('Brezel', nodes);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(worker.postMessage).toHaveBeenCalledWith(expect.objectContaining({kind: 'configure'}));
    expect(worker.postMessage).toHaveBeenCalledWith(expect.objectContaining({name: 'Brezel'}));
    model.enabledChanged.next(false);
    expect(await ranking).toEqual([]);
    expect(worker.terminate).toHaveBeenCalled();
  });
});
