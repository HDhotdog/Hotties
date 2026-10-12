import {AlertController, provideIonicAngular} from '@ionic/angular';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {Router} from '@angular/router';
import {BehaviorSubject, of, Subject, throwError} from 'rxjs';
import {CategoryService} from '../../category/category.service';
import {Category} from '../../category/category.dto';
import {CategorySettingComponent} from './category-setting.component';

describe('Shopping list settings', () => {
  let component: CategorySettingComponent;
  let fixture: ComponentFixture<CategorySettingComponent>;
  let lists: BehaviorSubject<Category[]>;
  let service: {save: jest.Mock; saveAll: jest.Mock; getItemCount: jest.Mock; deleteCategory: jest.Mock};
  let alert: {present: jest.Mock; onDidDismiss: jest.Mock};
  let createAlert: jest.Mock;
  const list = (id: string, name = id, sortOrder = 0): Category => ({id, name, sortOrder, saveSuggestions: true});

  beforeEach(async () => {
    lists = new BehaviorSubject([list('first'), list('second', 'second', 1), list('third', 'third', 2)]);
    service = {
      save: jest.fn(value => of(value)), saveAll: jest.fn(value => of(value)),
      getItemCount: jest.fn().mockResolvedValue(0), deleteCategory: jest.fn(() => of(true)),
    };
    alert = {present: jest.fn().mockResolvedValue(undefined), onDidDismiss: jest.fn().mockResolvedValue({role: 'cancel'})};
    createAlert = jest.fn().mockResolvedValue(alert);
    await TestBed.configureTestingModule({
      imports: [CategorySettingComponent],
      providers: [provideIonicAngular(),
        {provide: CategoryService, useValue: {...service, getCategories: () => lists}},
        {provide: AlertController, useValue: {create: createAlert}},
        {provide: Router, useValue: {navigate: jest.fn()}},
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CategorySettingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('adds a trimmed name inline at the end and clears only the saved draft', async () => {
    component.newListName = '  Weekend  ';
    const form = fixture.nativeElement.querySelector('.new-list-card form');
    form.dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}));
    await fixture.whenStable();
    expect(service.save).toHaveBeenCalledWith(expect.objectContaining({name: 'Weekend', sortOrder: 3, saveSuggestions: true}));
    expect(component.newListName).toBe('');
  });

  it('rejects blank and duplicate names without saving', async () => {
    component.newListName = '  ';
    await component.addList();
    component.newListName = ' FIRST ';
    await component.addList();
    expect(service.save).not.toHaveBeenCalled();
    expect(component.error).toContain('already exists');
  });

  it('renames inline while preserving the list id, order, and suggestion option', async () => {
    component.startEditing(component.categories[1]);
    component.editName = '  Groceries  ';
    component.editSaveSuggestions = false;
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.edit-row').dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}));
    await fixture.whenStable();
    expect(service.save).toHaveBeenCalledWith({id: 'second', name: 'Groceries', sortOrder: 1, saveSuggestions: false});
    expect(component.editingList).toBeNull();
  });

  it('keeps the draft and displays a save error', async () => {
    service.save.mockReturnValue(throwError(() => new Error('offline')));
    component.newListName = 'Weekend';
    await component.addList();
    expect(component.newListName).toBe('Weekend');
    expect(component.error).toContain('Could not add');
    expect(component.busy).toBe(false);
  });

  it('disables deletion of the last list and guards direct deletion calls', async () => {
    lists.next([list('only')]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('ion-button[aria-label="Delete shopping list only"]').disabled).toBe(true);
    await component.deleteList(component.categories[0]);
    expect(service.getItemCount).not.toHaveBeenCalled();
    expect(service.deleteCategory).not.toHaveBeenCalled();
  });

  it('shows the exact item count and cancels without deleting', async () => {
    service.getItemCount.mockResolvedValue(4);
    await component.deleteList(component.categories[0]);
    expect(createAlert).toHaveBeenCalledWith(expect.objectContaining({
      message: '4 items are still added to this list. Deleting the list will also delete these items.',
    }));
    expect(alert.present).toHaveBeenCalled();
    expect(service.deleteCategory).not.toHaveBeenCalled();
    expect(component.categories).toHaveLength(3);
    expect(component.busy).toBe(false);
  });

  it('deletes populated lists only after confirmation with the reviewed count', async () => {
    service.getItemCount.mockResolvedValue(1);
    alert.onDidDismiss.mockResolvedValue({role: 'confirm'});
    await component.deleteList(component.categories[0]);
    expect(createAlert.mock.calls[0][0].message).toContain('1 item is');
    expect(service.deleteCategory).toHaveBeenCalledWith('first', 1);
  });

  it('deletes an empty list without a warning dialog', async () => {
    await component.deleteList(component.categories[0]);
    expect(createAlert).not.toHaveBeenCalled();
    expect(service.deleteCategory).toHaveBeenCalledWith('first', 0);
  });

  it('retains the list and shows errors when deletion fails', async () => {
    service.deleteCategory.mockReturnValue(throwError(() => new Error('The items in this list changed.')));
    await component.deleteList(component.categories[0]);
    expect(component.error).toContain('items in this list changed');
    expect(component.categories).toHaveLength(3);
    expect(component.busy).toBe(false);
  });

  it('moves across several positions, persists the order, and ignores intermediate live emissions', async () => {
    const pending = new Subject<Category[]>();
    service.saveAll.mockReturnValue(pending);
    const complete = jest.fn();
    const saving = component.reorderLists(new CustomEvent('ionReorderEnd', {detail: {from: 0, to: 2, complete}}));
    expect(complete).toHaveBeenCalledWith(false);
    expect(service.saveAll).toHaveBeenCalledWith([list('second', 'second', 0), list('third', 'third', 1), list('first', 'first', 2)]);
    lists.next([list('first'), list('second'), list('third')]);
    expect(component.categories.map(entry => entry.id)).toEqual(['second', 'third', 'first']);
    pending.next(component.categories);
    pending.complete();
    await saving;
    expect(component.reorderDisabled).toBe(false);
  });

  it('restores the displayed order on a failed reorder and disables drag during editing', async () => {
    service.saveAll.mockReturnValue(throwError(() => new Error('write failed')));
    await component.reorderLists(new CustomEvent('ionReorderEnd', {detail: {from: 2, to: 0, complete: jest.fn()}}));
    expect(component.categories.map(entry => entry.id)).toEqual(['first', 'second', 'third']);
    expect(component.error).toContain('Could not save the shopping list order');
    component.startEditing(component.categories[0]);
    expect(component.reorderDisabled).toBe(true);
  });
});
