import {
  AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, input, OnDestroy, output, signal, viewChild
} from '@angular/core';
import {Ingredient} from '../../ingredients/ingredient.dto';

export interface CookingSlide {
  id: string;
  instructions: string;
  ingredients: Ingredient[];
}

@Component({
  selector: 'app-cooking-mode',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cooking-mode.component.html',
  styleUrls: ['./cooking-mode.component.scss'],
  host: {'(keydown)': 'onKeydown($event)'}
})
export class CookingModeComponent implements AfterViewInit, OnDestroy {
  readonly recipeName = input.required<string>();
  readonly slides = input.required<CookingSlide[]>();
  readonly closed = output<void>();
  readonly activeIndex = signal(0);
  private readonly viewport = viewChild<ElementRef<HTMLElement>>('viewport');
  private resizeObserver?: ResizeObserver;

  ngAfterViewInit(): void {
    const viewport = this.viewport()?.nativeElement;
    if (viewport && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        viewport.scrollTo({left: this.activeIndex() * viewport.clientWidth, behavior: 'instant'});
      });
      this.resizeObserver.observe(viewport);
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  goTo(index: number): void {
    if (index < 0 || index >= this.slides().length) return;
    // Scroll events own progress, including during smooth navigation. Setting the
    // destination here would be undone by the animation's first scroll frames.
    const viewport = this.viewport()?.nativeElement;
    if (!viewport) return;
    const reducedMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    viewport.scrollTo({left: index * viewport.clientWidth, behavior: reducedMotion ? 'instant' : 'smooth'});
  }

  onScroll(): void {
    const viewport = this.viewport()?.nativeElement;
    if (!viewport?.clientWidth) return;
    const index = Math.round(viewport.scrollLeft / viewport.clientWidth);
    this.activeIndex.set(Math.max(0, Math.min(this.slides().length - 1, index)));
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      this.goTo(this.activeIndex() + (event.key === 'ArrowRight' ? 1 : -1));
    }
  }
}
