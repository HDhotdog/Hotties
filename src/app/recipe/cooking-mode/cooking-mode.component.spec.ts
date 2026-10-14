import {ComponentFixture, TestBed} from '@angular/core/testing';
import {CookingModeComponent} from './cooking-mode.component';

describe('CookingModeComponent', () => {
  let fixture: ComponentFixture<CookingModeComponent>;
  let component: CookingModeComponent;
  let viewport: HTMLElement;
  let scrollTo: jest.Mock;

  beforeEach(async () => {
    await TestBed.configureTestingModule({imports: [CookingModeComponent]}).compileComponents();
    fixture = TestBed.createComponent(CookingModeComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('recipeName', 'Soup');
    fixture.componentRef.setInput('slides', [
      {id: 'chop', instructions: 'Chop the onion.', ingredients: [{id: 'onion', recipeId: 'recipe', name: 'Onion', amount: 1, unit: 'piece'}]},
      {id: 'rest', instructions: 'Rest.\nServe warm.', ingredients: []}
    ]);
    fixture.detectChanges();
    viewport = fixture.nativeElement.querySelector('.slides');
    Object.defineProperty(viewport, 'clientWidth', {value: 400});
    scrollTo = jest.fn();
    viewport.scrollTo = scrollTo;
  });

  it('shows one accessible slide, full recipe ingredient amounts and progress', () => {
    expect(component.activeIndex()).toBe(0);
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain('Step 1 of 2');
    const slides = fixture.nativeElement.querySelectorAll('.slide');
    expect(slides[0].hasAttribute('inert')).toBe(false);
    expect(slides[1].hasAttribute('inert')).toBe(true);
    expect(slides[0].textContent).toContain('1 piece Onion');
    expect(slides[1].textContent).toContain('No ingredients needed');
  });

  it('moves with buttons and keyboard, respects boundaries and synchronizes swipe progress', () => {
    component.goTo(-1);
    expect(scrollTo).not.toHaveBeenCalled();
    (fixture.nativeElement.querySelector('.next-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(scrollTo).toHaveBeenCalledWith({left: 400, behavior: 'smooth'});
    expect(component.activeIndex()).toBe(0);
    viewport.scrollLeft = 400;
    viewport.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();
    expect(component.activeIndex()).toBe(1);
    expect(fixture.nativeElement.querySelector('.next-button').textContent).toContain('Finish');
    component.goTo(2);
    expect(scrollTo).toHaveBeenCalledTimes(1);
    component.onKeydown(new KeyboardEvent('keydown', {key: 'ArrowLeft'}));
    expect(scrollTo).toHaveBeenLastCalledWith({left: 0, behavior: 'smooth'});
    viewport.scrollLeft = 0;
    viewport.dispatchEvent(new Event('scroll'));
    expect(component.activeIndex()).toBe(0);
    viewport.scrollLeft = 400;
    viewport.dispatchEvent(new Event('scroll'));
    expect(component.activeIndex()).toBe(1);
  });

  it('updates Next/Finish and progress only once while animating to the last slide and back', () => {
    const footer = (): string => {
      fixture.detectChanges();
      return [fixture.nativeElement.querySelector('.next-button').textContent.trim(),
        fixture.nativeElement.querySelector('[role="status"]').textContent.trim()].join(' · ');
    };
    const animate = (positions: number[]): string[] => positions.map(left => {
      viewport.scrollLeft = left;
      viewport.dispatchEvent(new Event('scroll'));
      return footer();
    });
    const changes = (states: string[]): string[] => states.filter((state, index) => state !== states[index - 1]);
    const forward = [footer()];
    fixture.nativeElement.querySelector('.next-button').click();
    forward.push(footer(), ...animate([0, 4, 45, 120, 199, 201, 280, 365, 399, 400]));
    expect(changes(forward)).toEqual(['Next · Step 1 of 2', 'Finish · Step 2 of 2']);

    const backward = [footer()];
    fixture.nativeElement.querySelector('.cooking-footer button').click();
    backward.push(footer(), ...animate([400, 396, 350, 280, 201, 199, 120, 35, 1, 0]));
    expect(changes(backward)).toEqual(['Finish · Step 2 of 2', 'Next · Step 1 of 2']);
  });

  it('closes from every step, finishes and restarts at step one in a new session', () => {
    const closed = jest.fn();
    component.closed.subscribe(closed);
    fixture.nativeElement.querySelector('.close-button').click();
    component.goTo(1);
    viewport.scrollLeft = 400;
    viewport.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.close-button').click();
    fixture.nativeElement.querySelector('.next-button').click();
    expect(closed).toHaveBeenCalledTimes(3);
    fixture.destroy();
    fixture = TestBed.createComponent(CookingModeComponent);
    expect(fixture.componentInstance.activeIndex()).toBe(0);
  });

  it('uses immediate navigation when reduced motion is requested', () => {
    const original = globalThis.matchMedia;
    globalThis.matchMedia = jest.fn().mockReturnValue({matches: true});
    try {
      component.goTo(1);
      expect(scrollTo).toHaveBeenCalledWith({left: 400, behavior: 'instant'});
    } finally {
      globalThis.matchMedia = original;
    }
  });
});
