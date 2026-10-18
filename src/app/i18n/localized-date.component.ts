import {LocalizedDatetimeDirective} from './localized-datetime.directive';
import {ChangeDetectionStrategy, Component, inject, model, signal} from '@angular/core';
import {IonDatetime, IonModal} from '@ionic/angular';
import {LocalizationService} from './localization.service';

@Component({
  selector: 'app-localized-date', standalone: true, imports: [IonDatetime, IonModal, LocalizedDatetimeDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" (click)="open.set(true)" [attr.aria-label]="i18n.t('ui.expiryDate')">
      {{ value() ? i18n.date(value()) : i18n.t('ui.expiryDate') }}
    </button>
    @if (value()) {
      <button type="button" (click)="value.set('')" [attr.aria-label]="i18n.t('ui.clearDate')">×</button>
    }
    <ion-modal [isOpen]="open()" (didDismiss)="open.set(false)" [attr.aria-label]="i18n.t('ui.expiryDate')">
      <ng-template>
        <ion-datetime appLocalizedDatetime presentation="date" [locale]="i18n.locale()" [firstDayOfWeek]="i18n.pack().meta.firstDayOfWeek" [value]="value() || undefined"
          [showDefaultButtons]="true" [doneText]="i18n.t('ui.done')" [cancelText]="i18n.t('ui.cancel')"
          (ionChange)="choose($event.detail.value)" (ionCancel)="open.set(false)"></ion-datetime>
      </ng-template>
    </ion-modal>`,
  styles: [`ion-modal { --width: min(95vw, 380px); --height: auto; } ion-datetime { margin: auto; } button { padding: .65rem; color: inherit; background: transparent; border: 1px solid var(--ion-color-medium); border-radius: .5rem; }`],
})
export class LocalizedDateComponent {
  public readonly i18n = inject(LocalizationService);
  public readonly value = model('');
  public readonly open = signal(false);
  public choose(value: string | string[] | null | undefined): void {
    if (typeof value === 'string') {this.value.set(value.slice(0, 10)); this.open.set(false);}
  }
}
