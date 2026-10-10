import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideIonicAngular} from '@ionic/angular';
import {Subject} from 'rxjs';
import {AmountUnit} from '../../shared/amount-unit.enum';
import {ItemType} from '../../todo/item-type.enum';
import {Item} from '../models/item.dto';
import {ItemService} from '../item.service';
import {ItemAutocompleteComponent} from './item-autocomplete.component';

describe('ItemAutocompleteComponent with OnPush', () => {
  let fixture: ComponentFixture<ItemAutocompleteComponent>;
  let items: Subject<Item[]>;

  beforeEach(async () => {
    items = new Subject<Item[]>();
    await TestBed.configureTestingModule({
      imports: [ItemAutocompleteComponent],
      providers: [
        provideIonicAngular(),
        {provide: ItemService, useValue: {findAll: () => items.asObservable()}},
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ItemAutocompleteComponent);
    fixture.detectChanges();
  });

  it('renders items emitted after the first check and hides them after blur', () => {
    jest.useFakeTimers();
    try {
      fixture.componentInstance.onInput('milk');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('ion-list')).toBeNull();

      items.next([{
        id: 'milk', name: 'Milk', price: null, unit: AmountUnit.LITER,
        amount: 1, type: ItemType.FOOD,
      }]);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('ion-list')?.textContent).toContain('Milk');

      fixture.componentInstance.onBlur();
      jest.advanceTimersByTime(150);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('ion-list')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });
});
