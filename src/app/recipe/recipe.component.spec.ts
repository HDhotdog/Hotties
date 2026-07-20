import {ComponentFixture, TestBed} from '@angular/core/testing';
import {IonicModule} from '@ionic/angular';
import {of} from 'rxjs';

import {RecipeComponent} from './recipe.component';
import {RecipeService} from './recipe.service';
import {LabelService} from '../label/label-service.service';
import {ActivatedRoute, Router} from '@angular/router';

describe('RecipeComponent', () => {
  let component: RecipeComponent;
  let fixture: ComponentFixture<RecipeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecipeComponent, IonicModule.forRoot()],
      providers: [
        {
          provide: RecipeService,
          useValue: {findAll: () => of([]), getImageUrl: () => of(null)},
        },
        {
          provide: LabelService,
          useValue: {
            getAllLabels: () => of([]),
            getAllLabelGroups: () => of([]),
          },
        },
        {
          provide: Router,
          useValue: {navigate: jest.fn()},
        },
        {
          provide: ActivatedRoute,
          useValue: {},
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RecipeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
