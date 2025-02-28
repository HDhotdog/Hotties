import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { TodoComponent } from './todo.component';
import { CategoryService } from '../category/category.service';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ImportanceLevel } from './todo';

describe('TodoComponent', () => {
  let component: TodoComponent;
  let fixture: ComponentFixture<TodoComponent>;
  let categoryService: CategoryService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TodoComponent],
      imports: [IonicModule.forRoot(), FormsModule, BrowserAnimationsModule],
      providers: [CategoryService]
    }).compileComponents();

    fixture = TestBed.createComponent(TodoComponent);
    component = fixture.componentInstance;
    categoryService = TestBed.inject(CategoryService);
    await component.ngOnInit();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should handle rapid deletions correctly', fakeAsync(() => {
    // Setup initial todos
    component.selectedCategory.elements = [
      { task: 'Task 1', done: false, importance: ImportanceLevel.NORMAL },
      { task: 'Task 2', done: false, importance: ImportanceLevel.NORMAL },
      { task: 'Task 3', done: false, importance: ImportanceLevel.NORMAL }
    ];

    // Trigger rapid deletions
    component.markAsDone(component.selectedCategory.elements[0]);
    component.markAsDone(component.selectedCategory.elements[1]);
    
    // Fast forward past animation
    tick(1200);
    
    expect(component.selectedCategory.elements.length).toBe(1);
    expect(component.selectedCategory.elements[0].task).toBe('Task 3');
  }));

  it('should initialize new todos with correct importance level', () => {
    // Set current importance level
    component.currentImportanceLevel = ImportanceLevel.HIGH;
    
    // Add todo with empty input (should use suggestion)
    component.addTodo('');
    
    // Check the last added todo
    const lastTodo = component.selectedCategory.elements[component.selectedCategory.elements.length - 1];
    expect(lastTodo.importance).toBe(ImportanceLevel.HIGH);
    
    // Add todo with text
    component.addTodo('Test task');
    
    // Check the last added todo
    const lastTodoWithText = component.selectedCategory.elements[component.selectedCategory.elements.length - 1];
    expect(lastTodoWithText.importance).toBe(ImportanceLevel.HIGH);
  });
});
