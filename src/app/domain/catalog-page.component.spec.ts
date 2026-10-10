import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideIonicAngular, MenuController} from '@ionic/angular';
import {of} from 'rxjs';
import {CatalogPageComponent} from './catalog-page.component';
import {CatalogService} from './catalog.service';
import {blankClass, CatalogNode} from './catalog.model';
import {addIcons} from 'ionicons';
import {add, chevronDownOutline, chevronForwardOutline, close, createOutline, menu} from 'ionicons/icons';

describe('CatalogPageComponent', () => {
  let fixture: ComponentFixture<CatalogPageComponent>;
  let page: CatalogPageComponent;
  let save: jest.Mock;
  const food = blankClass('root-food', 'Food', null);
  const vegetables = blankClass('vegetables', 'Vegetables', food.id);
  const onion: CatalogNode = {
    id: 'onion', parentId: vegetables.id, kind: 'product', name: 'Onion', brand: null,
    barcodes: [], saleKind: 'fixed', packageAmount: 1000, packageUnit: 'g',
    variableUnit: null, rawPackage: null, unitConversions: {}
  };

  beforeEach(async () => {
    addIcons({add, 'chevron-down-outline': chevronDownOutline,
      'chevron-forward-outline': chevronForwardOutline, close, 'create-outline': createOutline, menu});
    save = jest.fn().mockResolvedValue(undefined);
    await TestBed.configureTestingModule({
      imports: [CatalogPageComponent],
      providers: [
        provideIonicAngular(),
        {provide: MenuController, useValue: {open: jest.fn()}},
        {provide: CatalogService, useValue: {
          observe: () => of([food, vegetables, onion]), save,
          descendantsOf: (id: string, nodes: CatalogNode[]) => nodes.filter(node => node.parentId === id),
          depth: (id: string, nodes: CatalogNode[]) => id === food.id ? 0 :
            nodes.find(node => node.id === id)?.parentId === food.id ? 1 : 2
        }}
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(CatalogPageComponent);
    page = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('folds categories from their main row and keeps add and edit as separate buttons', () => {
    const foodRow = fixture.nativeElement.querySelector('.node-row') as HTMLElement;
    const label = foodRow.querySelector('.category-label') as HTMLButtonElement;
    expect(label.tagName).toBe('BUTTON');
    expect(label.getAttribute('aria-expanded')).toBe('true');
    expect(foodRow.querySelector('.node-add')).toBeTruthy();
    expect(foodRow.querySelector('.node-edit')).toBeTruthy();
    label.click();
    fixture.detectChanges();
    expect(page.visibleNodes).toEqual([food]);
  });

  it('opens editing in the modal and discards an unsaved conversion on close', () => {
    const edit = fixture.nativeElement.querySelector('.node-edit') as HTMLButtonElement;
    edit.click();
    expect(page.editorOpen).toBe(true);
    expect(page.editingId).toBe(food.id);
    page.setConversionEnabled('pinch', true);
    page.setConversionAmount('pinch', 1);
    page.reset();
    expect(page.unitConversions).toEqual({});
    expect(save).not.toHaveBeenCalled();
  });

  it('opens adding in the same modal and closes without writing', () => {
    page.openAdd(vegetables);
    fixture.detectChanges();
    expect(page.editorOpen).toBe(true);
    expect(page.addParentId).toBe(vegetables.id);
    expect((fixture.nativeElement.querySelector('ion-modal') as HTMLIonModalElement).isOpen).toBe(true);
    page.reset();
    expect(save).not.toHaveBeenCalled();
  });

  it('saves a product conversion entered through the modal', async () => {
    page.edit(onion);
    page.setConversionEnabled('piece', true);
    page.setConversionAmount('piece', 80);
    await page.save();
    expect(save).toHaveBeenCalledWith(expect.objectContaining({
      id: onion.id, unitConversions: {piece: {amount: 80, unit: 'g'}}
    }));
    expect(page.editorOpen).toBe(false);
  });
});
