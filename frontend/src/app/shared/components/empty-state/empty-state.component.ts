import { Component, Input, Output, EventEmitter } from '@angular/core';
import { IonIcon, IonButton } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { alertCircleOutline } from 'ionicons/icons';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [IonIcon, IonButton],
  styleUrl: './empty-state.component.scss',
  template: `
    <div class="empty-state">
      <ion-icon class="empty-state__icon" [name]="icon" />
      <h2 class="empty-state__title">{{ title }}</h2>
      <p class="empty-state__message">{{ message }}</p>
      @if (actionLabel) {
        <ion-button class="empty-state__action" (click)="action.emit()">
          {{ actionLabel }}
        </ion-button>
      }
    </div>
  `,
})
export class EmptyStateComponent {
  @Input() icon = 'alert-circle-outline';
  @Input() title = 'Nothing here yet';
  @Input() message = '';
  @Input() actionLabel = '';
  @Output() action = new EventEmitter<void>();

  constructor() {
    addIcons({ alertCircleOutline });
  }
}
