import {ComponentFixture, TestBed} from '@angular/core/testing';
import {IonicModule} from '@ionic/angular';
import {of} from 'rxjs';
import {TodoComponent} from './todo.component';
import {CategoryService} from '../category/category.service';
import {TodoService} from './todo.service';
import {SuggestionService} from './suggestion/suggestion.service';
import {FridgeService} from '../fridge/fridge.service';
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

  const category: Category = {id: 'cat-1', name: 'Edeka', saveSuggestions: true};
  const tasks: Todo[] = [
    {id: 't1', categoryId: 'cat-1', name: 'Task 1', done: false, type: ItemType.FOOD, amount: AmountUnit.PIECE}
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
    fridgeService.save.mockReturnValue(of({id: 'f1', name: 'Milk', amount: AmountUnit.PIECE, expiryDate: null}));

    await TestBed.configureTestingModule({
      imports: [TodoComponent, IonicModule.forRoot()],
      providers: [
        {provide: CategoryService, useValue: categoryService},
        {provide: TodoService, useValue: todoService},
        {provide: SuggestionService, useValue: suggestionService},
        {provide: FridgeService, useValue: fridgeService}
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

  it('saves a new todo for the selected category with the current item type', () => {
    component.setCurrentItemType(ItemType.USABLE);
    component.addTodo('Buy trash bags');

    expect(todoService.save).toHaveBeenCalledWith(expect.objectContaining({
      categoryId: 'cat-1',
      name: 'Buy trash bags',
      type: ItemType.USABLE
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

  it('tracks which item type is currently selected', () => {
    expect(component.isCurrentType(ItemType.FOOD)).toBe(true);

    component.setCurrentItemType(ItemType.PERMANENT);

    expect(component.isCurrentType(ItemType.PERMANENT)).toBe(true);
    expect(component.isCurrentType(ItemType.FOOD)).toBe(false);
  });
});
