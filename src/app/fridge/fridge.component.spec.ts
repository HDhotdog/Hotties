import {provideIonicAngular} from '@ionic/angular';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {ActivatedRoute} from '@angular/router';
import {of} from 'rxjs';
import {FridgeComponent} from './fridge.component';
import {FridgeService} from './fridge.service';
import {TodoService} from '../todo/todo.service';
import {CategoryService} from '../category/category.service';
import {FridgeItem} from './models/fridge-item.dto';
import {Category} from '../category/category.dto';
import {AmountUnit} from '../shared/amount-unit.enum';
import {ItemType} from '../todo/item-type.enum';

describe('FridgeComponent', () => {
  let component: FridgeComponent;
  let fixture: ComponentFixture<FridgeComponent>;
  let fridgeService: jest.Mocked<FridgeService>;
  let todoService: jest.Mocked<TodoService>;
  let categoryService: jest.Mocked<CategoryService>;

  const category: Category = {id: 'cat-1', name: 'Edeka', saveSuggestions: true};
  const today = new Date();
  const items: FridgeItem[] = [
    {id: 'f1', name: 'Milk', amount: AmountUnit.LITER, quantity: 2, expiryDate: null}
  ];

  beforeEach(async () => {
    fridgeService = {
      save: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      deleteById: jest.fn()
    } as unknown as jest.Mocked<FridgeService>;
    fridgeService.findAll.mockReturnValue(of(items));
    fridgeService.deleteById.mockReturnValue(of(true));

    todoService = {
      save: jest.fn()
    } as unknown as jest.Mocked<TodoService>;
    todoService.save.mockReturnValue(of({} as any));

    categoryService = {
      getCategories: jest.fn(),
      getSelectedCategoryId: jest.fn()
    } as unknown as jest.Mocked<CategoryService>;
    categoryService.getCategories.mockReturnValue(of([category]));
    categoryService.getSelectedCategoryId.mockReturnValue(of(category.id));

    await TestBed.configureTestingModule({
      imports: [FridgeComponent],
      providers: [
        provideIonicAngular(),
        {provide: FridgeService, useValue: fridgeService},
        {provide: TodoService, useValue: todoService},
        {provide: CategoryService, useValue: categoryService},
        {provide: ActivatedRoute, useValue: {snapshot: {paramMap: new Map()}}}
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FridgeComponent);
    component = fixture.componentInstance;
    component.ngOnInit();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads fridge items on init', () => {
    expect(fridgeService.findAll).toHaveBeenCalled();
    expect(component.items).toEqual(items);
  });

  it('reports "none" expiry status when no expiry date is set', () => {
    expect(component.expiryStatus(items[0])).toBe('none');
  });

  it('reports "expired" for a date in the past', () => {
    const pastDate = new Date(today);
    pastDate.setDate(pastDate.getDate() - 1);
    expect(component.expiryStatus({...items[0], expiryDate: pastDate.toISOString()})).toBe('expired');
  });

  it('reports "soon" for a date within the warning window', () => {
    const soonDate = new Date(today);
    soonDate.setDate(soonDate.getDate() + 1);
    expect(component.expiryStatus({...items[0], expiryDate: soonDate.toISOString()})).toBe('soon');
  });

  it('reports "fine" for a date well in the future', () => {
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + 30);
    expect(component.expiryStatus({...items[0], expiryDate: futureDate.toISOString()})).toBe('fine');
  });

  it('expiryLabel() is empty when no expiry date is set', () => {
    expect(component.expiryLabel(items[0])).toBe('');
  });

  it('expiryLabel() reads "exp. today" for a date expiring today', () => {
    expect(component.expiryLabel({...items[0], expiryDate: today.toISOString()})).toBe('exp. today');
  });

  it('expiryLabel() reads "exp. in 1 day" for tomorrow', () => {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(component.expiryLabel({...items[0], expiryDate: tomorrow.toISOString()})).toBe('exp. in 1 day');
  });

  it('expiryLabel() reads "exp. in x days" for further-out dates', () => {
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + 5);
    expect(component.expiryLabel({...items[0], expiryDate: futureDate.toISOString()})).toBe('exp. in 5 days');
  });

  it('expiryLabel() reads "expired 1 day ago" for yesterday', () => {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    expect(component.expiryLabel({...items[0], expiryDate: yesterday.toISOString()})).toBe('expired 1 day ago');
  });

  it('expiryLabel() reads "expired x days ago" for further-past dates', () => {
    const pastDate = new Date(today);
    pastDate.setDate(pastDate.getDate() - 5);
    expect(component.expiryLabel({...items[0], expiryDate: pastDate.toISOString()})).toBe('expired 5 days ago');
  });

  it('reorder() creates a new food todo with the item\'s name and amount', () => {
    component.reorder(items[0]);

    expect(todoService.save).toHaveBeenCalledWith(expect.objectContaining({
      categoryId: 'cat-1',
      name: 'Milk',
      amount: AmountUnit.LITER,
      type: ItemType.FOOD,
      done: false
    }));
  });

  it('deleteItem() removes the item and refreshes the list', () => {
    component.deleteItem(items[0]);

    expect(fridgeService.deleteById).toHaveBeenCalledWith('f1');
  });
});

describe('FridgeComponent sorting', () => {
  let component: FridgeComponent;
  let fixture: ComponentFixture<FridgeComponent>;
  let fridgeService: jest.Mocked<FridgeService>;

  const category: Category = {id: 'cat-1', name: 'Edeka', saveSuggestions: true};
  const today = new Date();
  const inDays = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return d.toISOString();
  };

  const items: FridgeItem[] = [
    {id: 'f1', name: 'Zucchini', amount: AmountUnit.PIECE, quantity: 3, expiryDate: inDays(5)},
    {id: 'f2', name: 'Apples', amount: AmountUnit.KILOGRAM, quantity: 1, expiryDate: null},
    {id: 'f3', name: 'Milk', amount: AmountUnit.LITER, quantity: 1, expiryDate: inDays(1)},
  ];

  beforeEach(async () => {
    fridgeService = {
      save: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      deleteById: jest.fn()
    } as unknown as jest.Mocked<FridgeService>;
    fridgeService.findAll.mockReturnValue(of(items));

    const todoService = {save: jest.fn()} as unknown as jest.Mocked<TodoService>;
    const categoryService = {
      getCategories: jest.fn(() => of([category])),
      getSelectedCategoryId: jest.fn(() => of(category.id))
    } as unknown as jest.Mocked<CategoryService>;

    await TestBed.configureTestingModule({
      imports: [FridgeComponent],
      providers: [
        provideIonicAngular(),
        {provide: FridgeService, useValue: fridgeService},
        {provide: TodoService, useValue: todoService},
        {provide: CategoryService, useValue: categoryService},
        {provide: ActivatedRoute, useValue: {snapshot: {paramMap: new Map()}}}
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FridgeComponent);
    component = fixture.componentInstance;
    component.ngOnInit();
  });

  it('defaults to sorting by expiry date, with items missing a date sorted last', () => {
    expect(component.sortBy).toBe('expiry');
    expect(component.items.map(i => i.id)).toEqual(['f3', 'f1', 'f2']);
  });

  it('toggleSortBy() switches to alphabetical order', () => {
    component.toggleSortBy();

    expect(component.sortBy).toBe('alphabetical');
    expect(component.items.map(i => i.id)).toEqual(['f2', 'f3', 'f1']);
  });

  it('toggleSortBy() switches back to expiry order', () => {
    component.toggleSortBy();
    component.toggleSortBy();

    expect(component.sortBy).toBe('expiry');
    expect(component.items.map(i => i.id)).toEqual(['f3', 'f1', 'f2']);
  });
});
