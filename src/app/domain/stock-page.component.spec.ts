import {SettingsRepository} from '../database/settings/settings.repository';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {Router} from '@angular/router';
import {MenuController, provideIonicAngular} from '@ionic/angular';
import {BehaviorSubject, of} from 'rxjs';
import {addIcons} from 'ionicons';
import {add, chevronDownOutline, chevronForwardOutline, menu, optionsOutline, pricetagsOutline,
  scanOutline, snowOutline, trashOutline} from 'ionicons/icons';
import {CatalogNode, blankClass} from './catalog.model';
import {CatalogService} from './catalog.service';
import {CategorySuggestionService} from './category-suggestion.service';
import {OfflineSpeech} from './offline-speech';
import {StockLot} from './shopping.model';
import {StockPageComponent} from './stock-page.component';
import {StockService} from './stock.service';

describe('StockPageComponent category view', () => {
  let fixture: ComponentFixture<StockPageComponent>;
  let nodes$: BehaviorSubject<CatalogNode[]>;
  let lots$: BehaviorSubject<StockLot[]>;
  let save: jest.Mock;
  let remove: jest.Mock;

  const food = blankClass('root-food', 'Food', null);
  const household = blankClass('root-household', 'Household', null);
  const fruit = blankClass('fruit', 'Obst', food.id);
  const apples = blankClass('apples', 'Äpfel', fruit.id);
  const bakery = blankClass('bakery', 'Backwaren', food.id);
  const empty = blankClass('empty', 'Empty', food.id);
  const cleaner = blankClass('cleaner', 'Reiniger', household.id);
  const product = (id: string, name: string, parentId: string): CatalogNode => ({
    id, name, parentId, kind: 'product', brand: null, barcodes: [], saleKind: 'fixed',
    packageAmount: 1, packageUnit: 'piece', variableUnit: null, rawPackage: null, unitConversions: {}
  });
  const apple = product('apple', 'Apfel', apples.id);
  const apricot = product('apricot', 'Aprikose', apples.id);
  const bread = product('bread', 'Brot', bakery.id);
  const soap = product('soap', 'Seife', cleaner.id);
  const lot = (id: string, productId: string, expiryDate: string | null = null): StockLot => ({
    id, productId, expiryDate, acquiredPackages: 1, acquiredAmount: 1,
    acquiredUnit: 'piece', remainingAmount: 1, allocations: [], createdAt: 1
  });

  const headings = (): string[] => Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.category-path'))
    .map(element => element.textContent?.trim() ?? '');
  const rowNames = (section: Element): string[] => Array.from(section.querySelectorAll('.lot-name'))
    .map((element: Element) => element.textContent?.trim() ?? '');

  beforeEach(async () => {
    localStorage.clear();
    addIcons({add, 'chevron-down-outline': chevronDownOutline, 'chevron-forward-outline': chevronForwardOutline,
      menu, 'options-outline': optionsOutline, 'pricetags-outline': pricetagsOutline,
      'scan-outline': scanOutline, 'snow-outline': snowOutline, 'trash-outline': trashOutline});
    jest.spyOn(OfflineSpeech, 'available').mockResolvedValue(false);
    nodes$ = new BehaviorSubject<CatalogNode[]>([food, household, fruit, apples, bakery, empty, cleaner,
      apple, apricot, bread, soap]);
    lots$ = new BehaviorSubject<StockLot[]>([]);
    save = jest.fn().mockResolvedValue(undefined);
    remove = jest.fn().mockImplementation(async (id: string) => {
      lots$.next(lots$.value.filter(item => item.id !== id));
    });
    await TestBed.configureTestingModule({
      imports: [StockPageComponent],
      providers: [
        provideIonicAngular(),
        {provide: SettingsRepository, useValue: {save: () => of({})}},
        {provide: Router, useValue: {navigate: jest.fn()}},
        {provide: MenuController, useValue: {open: jest.fn()}},
        {provide: CatalogService, useValue: {observe: () => nodes$.asObservable(), matches: jest.fn()}},
        {provide: StockService, useValue: {observe: () => lots$.asObservable(), save, remove}},
        {provide: CategorySuggestionService, useValue: {rank: jest.fn(),
          availability: jest.fn().mockResolvedValue({enabled: true, ready: true})}}
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(StockPageComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
  });

  it('shows stocked direct-parent categories in path order and sorts products and their lots', () => {
    lots$.next([lot('late', apple.id, '2026-12-20'), lot('soap', soap.id), lot('bread', bread.id),
      lot('apricot', apricot.id), lot('early', apple.id, '2026-12-10')]);
    fixture.detectChanges();

    expect(headings()).toEqual(['Food / Backwaren', 'Food / Obst / Äpfel', 'Household / Reiniger']);
    const sections = fixture.nativeElement.querySelectorAll('.category-section') as NodeListOf<HTMLElement>;
    expect(fixture.nativeElement.querySelectorAll('.lot').length).toBe(0);
    expect(sections[1].querySelector('.category-toggle')?.getAttribute('aria-expanded')).toBe('false');
    (sections[1].querySelector('.category-toggle') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(rowNames(sections[1])).toEqual(['Apfel', 'Apfel', 'Aprikose']);
    expect(fixture.componentInstance.stockCategories[1].lots.map(item => item.id)).toEqual(['early', 'late', 'apricot']);
    expect(sections[1].querySelector('.category-count')?.textContent?.trim()).toBe('3');
    expect(sections[1].querySelector('.category-toggle')?.getAttribute('aria-expanded')).toBe('true');
  });

  it('starts folded, closes an editor when folded, and restores opened sections on a new page instance', () => {
    lots$.next([lot('bread', bread.id), lot('apple', apple.id)]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.lot').length).toBe(0);
    (fixture.nativeElement.querySelector('.category-toggle') as HTMLButtonElement).click();
    fixture.detectChanges();
    const breadRow = fixture.nativeElement.querySelector('.lot-main') as HTMLButtonElement;
    breadRow.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.editing?.id).toBe('bread');

    (fixture.nativeElement.querySelector('.category-toggle') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.componentInstance.editing).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.lot').length).toBe(0);
    expect(fixture.nativeElement.querySelector('.category-toggle').getAttribute('aria-expanded')).toBe('false');
    expect(JSON.parse(localStorage.getItem('fridge-expanded-category-ids-v1')!)).toEqual([]);

    (fixture.nativeElement.querySelector('.category-toggle') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(JSON.parse(localStorage.getItem('fridge-expanded-category-ids-v1')!)).toEqual(['bakery']);

    fixture.destroy();
    fixture = TestBed.createComponent(StockPageComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.category-toggle').getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelectorAll('.category-toggle')[1].getAttribute('aria-expanded')).toBe('false');
    expect(fixture.nativeElement.querySelectorAll('.lot').length).toBe(1);
    (fixture.nativeElement.querySelector('.category-toggle') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.lot').length).toBe(0);
  });

  it('responds to catalog and stock changes, including removal and the empty state', async () => {
    expect(fixture.nativeElement.textContent).toContain('Your fridge is empty');
    lots$.next([lot('bread', bread.id), lot('apple', apple.id)]);
    fixture.detectChanges();
    expect(headings()).toEqual(['Food / Backwaren', 'Food / Obst / Äpfel']);

    nodes$.next(nodes$.value.map(node => node.id === bakery.id ? {...node, name: 'Zwieback'} : node));
    fixture.detectChanges();
    expect(headings()).toEqual(['Food / Obst / Äpfel', 'Food / Zwieback']);

    const breadSection = (Array.from(fixture.nativeElement.querySelectorAll('.category-section')) as HTMLElement[])
      .find(section => section.textContent?.includes('Zwieback'))!;
    (breadSection.querySelector('.category-toggle') as HTMLButtonElement).click();
    fixture.detectChanges();
    (breadSection.querySelector('.remove-button') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(remove).toHaveBeenCalledWith('bread');
    expect(headings()).toEqual(['Food / Obst / Äpfel']);

    lots$.next([]);
    fixture.detectChanges();
    expect(headings()).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('Your fridge is empty');
  });

  it('keeps lot editing and saving inside an expanded category', async () => {
    lots$.next([lot('bread', bread.id)]);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.category-toggle') as HTMLButtonElement).click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.lot-main') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.edit-panel')).toBeTruthy();
    fixture.componentInstance.remainingAmount = 0.5;
    fixture.componentInstance.expiryDate = '2026-12-25';
    (fixture.nativeElement.querySelector('.edit-actions .primary-action') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(save).toHaveBeenCalledWith(expect.objectContaining({
      id: 'bread', remainingAmount: 0.5, expiryDate: '2026-12-25'
    }));
    expect(fixture.nativeElement.querySelector('.edit-panel')).toBeNull();
  });

  it('colors undated, expired, near-expiry, and later lots using the four legacy states', () => {
    jest.useFakeTimers();
    try {
      jest.setSystemTime(new Date(2026, 2, 28, 12));
      const dateAfter = (days: number): string => {
        const date = new Date(2026, 2, 28, 12);
        date.setDate(date.getDate() + days);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      };
      const undated = lot('undated', bread.id);
      const expired = lot('expired', bread.id, dateAfter(-1));
      const today = lot('today', bread.id, dateAfter(0));
      const soon = lot('soon', bread.id, dateAfter(3));
      const fine = lot('fine', bread.id, dateAfter(4));
      lots$.next([undated, expired, today, soon, fine]);
      fixture.detectChanges();
      (fixture.nativeElement.querySelector('.category-toggle') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect([undated, expired, today, soon, fine].map(item => fixture.componentInstance.expiryStatus(item)))
        .toEqual(['none', 'expired', 'soon', 'soon', 'fine']);
      expect(fixture.nativeElement.querySelectorAll('.lot.no-expiry').length).toBe(1);
      expect(fixture.nativeElement.querySelectorAll('.lot.expired').length).toBe(1);
      expect(fixture.nativeElement.querySelectorAll('.lot.soon').length).toBe(2);
      expect(fixture.nativeElement.querySelectorAll('.lot:not(.no-expiry):not(.expired):not(.soon)').length).toBe(1);
    } finally {
      jest.useRealTimers();
    }
  });
  it('updates unknown-category headings when the language changes', async () => {
    lots$.next([lot('orphan', 'removed-product')]);
    const page = fixture.componentInstance;
    expect(page.stockCategories[0].path).toBe('Unknown category');
    await page.i18n.setLanguage('de');
    expect(page.stockCategories[0].path).toBe('Unbekannte Kategorie');
  });

});
