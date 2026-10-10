import {provideIonicAngular} from '@ionic/angular';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {of} from 'rxjs';
import {TodoComponent} from './todo.component';
import {CategoryService} from '../category/category.service';
import {TodoService} from './todo.service';
import {SuggestionService} from './suggestion/suggestion.service';
import {FridgeService} from '../fridge/fridge.service';
import {ItemService} from '../item/item.service';
import {ItemType} from './item-type.enum';
import {AmountUnit} from '../shared/amount-unit.enum';
import {Category} from '../category/category.dto';
import {Todo} from './todo.dto';

describe('TodoComponent', () => {
  let component: TodoComponent;
  let fixture: ComponentFixture<TodoComponent>;
  let todoService: jest.Mocked<TodoService>;
  let categoryService: jest.Mocked<CategoryService>;
  let suggestionService: jest.Mocked<SuggestionService>;
  let fridgeService: jest.Mocked<FridgeService>;
  let itemService: jest.Mocked<ItemService>;

  const category: Category = {id: 'cat-1', name: 'Edeka', saveSuggestions: true};
  const tasks: Todo[] = [
    {
      id: 't1',
      categoryId: 'cat-1',
      name: 'Task 1',
      done: false,
      type: ItemType.FOOD,
      amount: AmountUnit.PIECE,
      itemId: 'item-task-1',
      quantity: 1
    }
  ];

  beforeEach(async () => {
    todoService = {
      findByCategoryId: jest.fn(),
      save: jest.fn(),
      deleteById: jest.fn(),
      deleteByCategoryId: jest.fn(),
      deleteAll: jest.fn()
    } as unknown as jest.Mocked<TodoService>;
    todoService.findByCategoryId.mockReturnValue(of(tasks));
    todoService.save.mockReturnValue(of(tasks[0]));
    todoService.deleteById.mockReturnValue(of(true));
    todoService.deleteByCategoryId.mockReturnValue(of(1));

    categoryService = {
      getCategories: jest.fn(),
      save: jest.fn(),
      saveCurrentCategory: jest.fn(),
      getSelectedCategoryId: jest.fn()
    } as unknown as jest.Mocked<CategoryService>;
    categoryService.getCategories.mockReturnValue(of([category]));
    categoryService.getSelectedCategoryId.mockReturnValue(of(category.id));
    categoryService.saveCurrentCategory.mockReturnValue(of(undefined));
    categoryService.save.mockReturnValue(of(category));

    suggestionService = {
      findByCategoryId: jest.fn(),
      save: jest.fn()
    } as unknown as jest.Mocked<SuggestionService>;
    suggestionService.findByCategoryId.mockReturnValue(of([]));
    suggestionService.save.mockReturnValue(of({id: 's1', categoryId: 'cat-1', suggestion: 'Cookies', suffix: '! :D'}));

    fridgeService = {
      save: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      deleteById: jest.fn()
    } as unknown as jest.Mocked<FridgeService>;
    fridgeService.save.mockReturnValue(of({
      id: 'f1',
      name: 'Milk',
      amount: AmountUnit.PIECE,
      quantity: 1,
      expiryDate: null
    }));

    itemService = {
      findAll: jest.fn(),
      findOrCreateByName: jest.fn()
    } as unknown as jest.Mocked<ItemService>;
    itemService.findAll.mockReturnValue(of([]));
    itemService.findOrCreateByName.mockReturnValue(of({
      id: 'item-1', name: 'Buy trash bags', price: null, unit: AmountUnit.PACKAGE, amount: 1, type: ItemType.USABLE
    }));

    await TestBed.configureTestingModule({
      imports: [TodoComponent],
      providers: [
        provideIonicAngular(),
        {provide: CategoryService, useValue: categoryService},
        {provide: TodoService, useValue: todoService},
        {provide: SuggestionService, useValue: suggestionService},
        {provide: FridgeService, useValue: fridgeService},
        {provide: ItemService, useValue: itemService}
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TodoComponent);
    component = fixture.componentInstance;
    await component.ngOnInit();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads todos for the selected category on init', () => {
    expect(todoService.findByCategoryId).toHaveBeenCalledWith('cat-1');
    expect(component.categoryTasks).toEqual(tasks);
  });

  it('saves a new todo for the selected category, with type/unit taken from the resolved item', () => {
    component.addTodo('Buy trash bags');

    expect(itemService.findOrCreateByName).toHaveBeenCalledWith('Buy trash bags', AmountUnit.PACKAGE);
    expect(todoService.save).toHaveBeenCalledWith(expect.objectContaining({
      categoryId: 'cat-1',
      name: 'Buy trash bags',
      type: ItemType.USABLE,
      amount: AmountUnit.PACKAGE,
      itemId: 'item-1',
      quantity: 1
    }));
  });

  it('increments quantity instead of duplicating when the resolved item is already on the list', () => {
    itemService.findOrCreateByName.mockReturnValue(of({
      id: 'item-task-1', name: 'Task 1', price: null, unit: AmountUnit.PIECE, amount: 1, type: ItemType.FOOD
    }));

    component.addTodo('Task 1');

    expect(todoService.save).toHaveBeenCalledWith(expect.objectContaining({
      id: 't1',
      quantity: 2
    }));
  });

  it('deletes a todo and refreshes the list when marked as done', () => {
    const findByCategoryIdCallsBefore = todoService.findByCategoryId.mock.calls.length;

    component.markAsDone(tasks[0]);

    expect(todoService.deleteById).toHaveBeenCalledWith('t1');
    expect(todoService.findByCategoryId.mock.calls.length).toBeGreaterThan(findByCategoryIdCallsBefore);
  });

  it('moves a food todo to the fridge when marked as done', () => {
    component.markAsDone(tasks[0]);

    expect(fridgeService.save).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Task 1',
      amount: AmountUnit.PIECE,
      quantity: 1,
      expiryDate: null
    }));
  });

  it('does not move a non-food todo to the fridge when marked as done', () => {
    component.markAsDone({...tasks[0], type: ItemType.PERMANENT});

    expect(fridgeService.save).not.toHaveBeenCalled();
  });

  it('clears todos scoped to the currently selected category only', () => {
    jest.useFakeTimers();
    try {
      component.clearTodos();
      jest.advanceTimersByTime(1100);

      expect(todoService.deleteByCategoryId).toHaveBeenCalledWith('cat-1');
      expect(todoService.deleteAll).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

});
