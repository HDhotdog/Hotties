import {AfterViewInit, DestroyRef, Directive, ElementRef, inject, NgZone} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {LocalizationService} from './localization.service';

/** Ionic localizes date names, but its calendar control labels are hard-coded English. */
@Directive({selector: 'ion-datetime[appLocalizedDatetime]', standalone: true})
export class LocalizedDatetimeDirective implements AfterViewInit {
  private readonly element = inject<ElementRef<HTMLElement & {componentOnReady?: () => Promise<unknown>}>>(ElementRef);
  private readonly i18n = inject(LocalizationService);
  private readonly destroy = inject(DestroyRef);
  private readonly zone = inject(NgZone);
  private readonly assigned = new WeakMap<Element, string>();
  private readonly todayLabels = new WeakMap<Element, {base: string; applied: string}>();
  private observer?: MutationObserver;
  private readonly labels: Record<string, string> = {
    'Show year picker': 'date.showYear', 'Hide year picker': 'date.hideYear',
    'Select a date': 'date.selectDate', 'Select a day': 'date.selectDay',
    'Select a month': 'date.selectMonth', 'Select a year': 'date.selectYear',
  };

  constructor() {
    this.destroy.onDestroy(() => this.observer?.disconnect());
    this.i18n.languageChanged.pipe(takeUntilDestroyed()).subscribe(() => this.localize());
  }
  public async ngAfterViewInit(): Promise<void> {
    await this.element.nativeElement.componentOnReady?.();
    if (this.destroy.destroyed || !this.element.nativeElement.shadowRoot) return;
    this.zone.runOutsideAngular(() => {
      this.observer = new MutationObserver(() => this.localize());
      this.observer.observe(this.element.nativeElement.shadowRoot!, {
        subtree: true, childList: true, attributes: true, attributeFilter: ['aria-label'],
      });
      this.localize();
    });
  }
  private setLabel(element: Element, label: string): void {
    if (element.getAttribute('aria-label') !== label) element.setAttribute('aria-label', label);
  }
  private localize(): void {
    const root = this.element.nativeElement.shadowRoot;
    if (!root) return;
    for (const [part, key] of [['previous-button', 'date.previousMonth'], ['next-button', 'date.nextMonth']]) {
      const button = root.querySelector(`[part~="${part}"]`);
      if (button) this.setLabel(button, this.i18n.t(key));
    }
    for (const element of Array.from(root.querySelectorAll('[aria-label]'))) {
      const current = element.getAttribute('aria-label')!;
      const key = this.labels[current] ?? this.assigned.get(element);
      if (key) {this.assigned.set(element, key); this.setLabel(element, this.i18n.t(key));}
      const previous = this.todayLabels.get(element);
      const base = current.startsWith('Today, ') ? current.slice(5) : previous?.applied === current ? previous.base : undefined;
      if (base !== undefined) {
        const applied = this.i18n.t('date.today') + base;
        this.todayLabels.set(element, {base, applied});
        this.setLabel(element, applied);
      } else if (previous) this.todayLabels.delete(element);
    }
  }
}
