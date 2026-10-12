import {provideIonicAngular} from '@ionic/angular';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {Router} from '@angular/router';
import {BehaviorSubject, defer, of, Subject, throwError} from 'rxjs';
import {LabelService} from '../../label/label-service.service';
import {Label, LabelGroup} from '../../label/models/label.dto';
import {LabelSettingComponent} from './label-setting.component';

describe('LabelSettingComponent', () => {
  let component: LabelSettingComponent;
  let fixture: ComponentFixture<LabelSettingComponent>;
  let groups: BehaviorSubject<LabelGroup[]>;
  let labels: BehaviorSubject<Label[]>;
  let service: {
    getAllLabelGroups: jest.Mock;
    getAllLabels: jest.Mock;
    saveLabelGroup: jest.Mock;
    saveLabel: jest.Mock;
    saveAllGroups: jest.Mock;
    saveAllLabels: jest.Mock;
    deleteLabelById: jest.Mock;
    deleteLabelGroupById: jest.Mock;
  };
  let persistedGroups: jest.Mock;
  let persistedLabels: jest.Mock;
  const taste: LabelGroup = {id: 'taste', name: 'Geschmack'};
  const kind: LabelGroup = {id: 'kind', name: 'Art'};
  const salty: Label = {id: 'salty', groupId: taste.id, recipeId: '', name: 'Salzig'};

  beforeEach(async () => {
    groups = new BehaviorSubject([{...taste}, {...kind}]);
    labels = new BehaviorSubject([{...salty}]);
    persistedGroups = jest.fn();
    persistedLabels = jest.fn();
    service = {
      getAllLabelGroups: jest.fn(() => groups),
      getAllLabels: jest.fn(() => labels),
      saveLabelGroup: jest.fn((group: LabelGroup) => defer(() => {
        persistedGroups(group);
        groups.next([...groups.value.filter(item => item.id !== group.id), group]);
        return of(group);
      })),
      saveLabel: jest.fn((label: Label) => defer(() => {
        persistedLabels(label);
        labels.next([...labels.value.filter(item => item.id !== label.id), label]);
        return of(label);
      })),
      saveAllGroups: jest.fn((ordered: LabelGroup[]) => defer(() => {
        groups.next(ordered);
        return of(ordered);
      })),
      saveAllLabels: jest.fn((ordered: Label[]) => defer(() => {
        const updated = new Map(ordered.map(label => [label.id, label]));
        labels.next(labels.value.map(label => updated.get(label.id) ?? label));
        return of(ordered);
      })),
      deleteLabelById: jest.fn(() => of(true)),
      deleteLabelGroupById: jest.fn(() => of(true)),
    };
    await TestBed.configureTestingModule({
      imports: [LabelSettingComponent],
      providers: [
        provideIonicAngular(),
        {provide: Router, useValue: {navigate: jest.fn()}},
        {provide: LabelService, useValue: service},
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(LabelSettingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  const enterText = (input: HTMLInputElement, value: string) => {
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };

  it('always shows a label form in every group, with group creation last', () => {
    const cards = fixture.nativeElement.querySelectorAll('.group-card') as NodeListOf<HTMLElement>;
    expect(cards).toHaveLength(2);
    for (const card of cards) {
      expect(card.querySelector('.add-row input')).toBeTruthy();
      expect(card.querySelector('.add-row ion-button')?.textContent?.trim()).toBe('');
    }
    const container = fixture.nativeElement.querySelector('.label-settings') as HTMLElement;
    expect(container.lastElementChild?.className).toBe('new-group-card');
  });

  it('submits to the correct group and clears only that group draft', async () => {
    const forms = fixture.nativeElement.querySelectorAll('.group-card .add-row') as NodeListOf<HTMLFormElement>;
    enterText(forms[0].querySelector('input')!, '  Sauer  ');
    enterText(forms[1].querySelector('input')!, 'Snack');
    forms[0].dispatchEvent(new Event('submit', {cancelable: true}));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(persistedLabels).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Sauer', groupId: taste.id, recipeId: '',
    }));
    expect(component.labelDraft(taste.id)).toBe('');
    expect(component.labelDraft(kind.id)).toBe('Snack');
    expect(fixture.nativeElement.textContent).toContain('Sauer');
  });

  it('ignores whitespace-only labels and groups', () => {
    component.labelDrafts[taste.id] = '  ';
    component.newGroupName = '  ';
    component.addLabel(taste);
    component.addLabelGroup();
    expect(service.saveLabel).not.toHaveBeenCalled();
    expect(service.saveLabelGroup).not.toHaveBeenCalled();
  });

  it('creates a persisted group from the bottom form with its own label input', async () => {
    const form = fixture.nativeElement.querySelector('.new-group-card form') as HTMLFormElement;
    enterText(form.querySelector('input')!, '  Küche  ');
    form.dispatchEvent(new Event('submit', {cancelable: true}));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(persistedGroups).toHaveBeenCalledWith(expect.objectContaining({name: 'Küche'}));
    expect(component.newGroupName).toBe('');
    expect(fixture.nativeElement.querySelectorAll('.group-card .add-row input')).toHaveLength(3);
    expect(fixture.nativeElement.querySelector('.label-settings').lastElementChild.className).toBe('new-group-card');
  });

  it('prevents repeated submissions and preserves text typed during a pending label save', () => {
    const pending = new Subject<Label>();
    service.saveLabel.mockReturnValue(pending);
    component.labelDrafts[taste.id] = 'Sauer';
    component.addLabel(taste);
    component.addLabel(taste);
    expect(service.saveLabel).toHaveBeenCalledTimes(1);
    component.labelDrafts[taste.id] = 'Süß';
    pending.next({...salty, name: 'Sauer'});
    pending.complete();
    expect(component.labelDraft(taste.id)).toBe('Süß');
    expect(component.savingLabels.has(taste.id)).toBe(false);
  });

  it('keeps failed label and group drafts so they can be retried', () => {
    service.saveLabel.mockReturnValue(throwError(() => new Error('write failed')));
    service.saveLabelGroup.mockReturnValue(throwError(() => new Error('write failed')));
    component.labelDrafts[taste.id] = 'Sauer';
    component.addLabel(taste);
    expect(component.labelDraft(taste.id)).toBe('Sauer');
    expect(component.savingLabels.has(taste.id)).toBe(false);
    expect(component.error).toContain('Could not add the label');
    component.newGroupName = 'Küche';
    component.addLabelGroup();
    expect(component.newGroupName).toBe('Küche');
    expect(component.labelGroups).toHaveLength(2);
    expect(component.savingGroup).toBe(false);
    expect(component.error).toContain('Could not add the group');
  });

  it('switches from group editing to label editing and persists the correct name', () => {
    component.startEditingGroup(taste);
    component.startEditingLabel(taste, salty);
    component.editName = '  Herzhaft  ';
    component.saveEdit();
    expect(persistedGroups).not.toHaveBeenCalled();
    expect(persistedLabels).toHaveBeenCalledWith({...salty, name: 'Herzhaft'});
    expect(component.editingLabel).toBeNull();
  });

  it('retains an editor and the original name if renaming fails', () => {
    service.saveLabelGroup.mockReturnValue(throwError(() => new Error('write failed')));
    const group = component.labelGroups[0];
    component.startEditingGroup(group);
    component.editName = 'Aromen';
    component.saveEdit();
    expect(group.name).toBe('Geschmack');
    expect(component.editingGroup).toBe(group);
    expect(component.editName).toBe('Aromen');
    expect(component.savingEdit).toBe(false);
  });

  it('persists dragged groups while keeping their input drafts attached to the same ids', () => {
    component.labelDrafts[taste.id] = 'Sauer';
    const complete = jest.fn();
    const event = new CustomEvent('ionReorderEnd', {bubbles: true, detail: {from: 0, to: 1, complete}});
    fixture.nativeElement.querySelector('.group-order').dispatchEvent(event);
    fixture.detectChanges();
    expect(complete).toHaveBeenCalledWith(false);
    expect(service.saveAllGroups).toHaveBeenCalledWith([
      {...kind, sortOrder: 0}, {...taste, sortOrder: 1},
    ]);
    expect(component.labelGroups.map(group => group.id)).toEqual([kind.id, taste.id]);
    expect(component.labelDraft(taste.id)).toBe('Sauer');
  });

  it('persists a label drag only within its group and stops the event reaching the group reorder', () => {
    const sour = {...salty, id: 'sour', name: 'Sauer'};
    labels.next([salty, sour, {...salty, id: 'recipe-salty', recipeId: 'recipe'}]);
    fixture.detectChanges();
    const complete = jest.fn();
    const event = new CustomEvent('ionReorderEnd', {bubbles: true, detail: {from: 0, to: 1, complete}});
    fixture.nativeElement.querySelector('.labels').dispatchEvent(event);
    fixture.detectChanges();
    expect(service.saveAllLabels).toHaveBeenCalledWith([
      {...sour, sortOrder: 0}, {...salty, sortOrder: 1},
    ]);
    expect(component.labelsForGroup(taste.id).map(label => label.id)).toEqual(['sour', 'salty']);
    expect(service.saveAllGroups).not.toHaveBeenCalled();
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('restores the displayed order and reports a failed reorder save', () => {
    service.saveAllGroups.mockReturnValue(throwError(() => new Error('write failed')));
    component.reorderGroups(new CustomEvent('ionReorderEnd', {detail: {from: 0, to: 1, complete: jest.fn()}}));
    expect(component.labelGroups.map(group => group.id)).toEqual([taste.id, kind.id]);
    expect(component.reorderDisabled).toBe(false);
    expect(component.error).toContain('Could not save the group order');
  });

  it('keeps only label definitions in the group rows', () => {
    labels.next([{...salty}, {...salty, id: 'recipe-salty', recipeId: 'recipe'}]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.label-row')).toHaveLength(1);
  });

  it('keeps an active editor when the live query replaces objects with the same ids', () => {
    component.startEditingGroup(component.labelGroups[0]);
    groups.next([{...taste}, {...kind}]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.group-header .edit-row input')).toBeTruthy();
  });
});
