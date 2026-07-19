import {ComponentFixture, TestBed} from '@angular/core/testing';
import {IonicModule} from '@ionic/angular';
import {of} from 'rxjs';
import {TodoComponent} from './todo.component';
import {CategoryService} from '../category/category.service';
import {TodoService} from './todo.service';
import {SuggestionService} from './suggestion/suggestion.service';
import {ImportanceLevel} from './importance-level.enum';
import {RxCategory} from '../category/category';
import {RxToDo} from './rxToDo';

describe('TodoComponent', () => {
  let component: TodoComponent;
  let fixture: ComponentFixture<TodoComponent>;
  let todoService: jasmine.SpyObj<TodoService>;
  let categoryService: jasmine.SpyObj<CategoryService>;
  let suggestionService: jasmine.SpyObj<SuggestionService>;

  const category: RxCategory = {id: 'cat-1', name: 'Edeka', saveSuggestions: true};
  const tasks: RxToDo[] = [
    {id: 't1', categoryId: 'cat-1', name: 'Task 1', done: false, importance: ImportanceLevel.NORMAL}
  ];

  beforeEach(async () => {
    localStorage.removeItem('selectedCategoryId');

    todoService = jasmine.createSpyObj('TodoService', [
      'findByCategoryId', 'save', 'deleteById', 'deleteByCategoryId', 'deleteAll'
    ]);
    todoService.findByCategoryId.and.returnValue(of(tasks));
    todoService.save.and.returnValue(of(tasks[0]));
    todoService.deleteById.and.returnValue(of(true));
    todoService.deleteByCategoryId.and.returnValue(of(1));

    categoryService = jasmine.createSpyObj('CategoryService', ['getCategories', 'save', 'saveCurrentCategory']);
    categoryService.getCategories.and.returnValue(of([category]));

    suggestionService = jasmine.createSpyObj('SuggestionService', ['findByCategoryId', 'save']);
    suggestionService.findByCategoryId.and.returnValue(of([]));
    suggestionService.save.and.returnValue(of({id: 's1', categoryId: 'cat-1', suggestion: 'Cookies', suffix: '! :D'}));

    await TestBed.configureTestingModule({
      imports: [TodoComponent, IonicModule.forRoot()],
      providers: [
        {provide: CategoryService, useValue: categoryService},
        {provide: TodoService, useValue: todoService},
        {provide: SuggestionService, useValue: suggestionService}
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

  it('saves a new todo for the selected category with the current importance level', () => {
    component.setCurrentImportanceLevel('HIGH');
    component.addTodo('Buy milk');

    expect(todoService.save).toHaveBeenCalledWith(jasmine.objectContaining({
      categoryId: 'cat-1',
      name: 'Buy milk',
      importance: ImportanceLevel.HIGH
    }));
  });

  it('deletes a todo and refreshes the list when marked as done', () => {
    const findByCategoryIdCallsBefore = todoService.findByCategoryId.calls.count();

    component.markAsDone(tasks[0]);

    expect(todoService.deleteById).toHaveBeenCalledWith('t1');
    expect(todoService.findByCategoryId.calls.count()).toBeGreaterThan(findByCategoryIdCallsBefore);
  });

  it('clears todos scoped to the currently selected category only', () => {
    jasmine.clock().install();
    try {
      component.clearTodos();
      jasmine.clock().tick(1100);

      expect(todoService.deleteByCategoryId).toHaveBeenCalledWith('cat-1');
      expect(todoService.deleteAll).not.toHaveBeenCalled();
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('tracks which importance level is currently selected', () => {
    expect(component.isCurrentLevel('NORMAL')).toBeTrue();

    component.setCurrentImportanceLevel('VERY_HIGH');

    expect(component.isCurrentLevel('VERY_HIGH')).toBeTrue();
    expect(component.isCurrentLevel('NORMAL')).toBeFalse();
  });
});
