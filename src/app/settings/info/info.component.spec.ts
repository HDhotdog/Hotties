import {provideIonicAngular} from '@ionic/angular';
import {ComponentFixture, TestBed, waitForAsync} from '@angular/core/testing';
import {Location} from '@angular/common';
import {CategoryService} from '../../category/category.service';

import {InfoComponent} from './info.component';

describe('InfoComponent', () => {
  let component: InfoComponent;
  let fixture: ComponentFixture<InfoComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [InfoComponent],
      providers: [
        provideIonicAngular(),
        {
          provide: Location, useValue: {
            back: () => {
            }
          }
        },
        {provide: CategoryService, useValue: {}}
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
