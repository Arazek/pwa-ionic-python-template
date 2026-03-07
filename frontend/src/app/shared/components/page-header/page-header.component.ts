import { Component, Input } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton } from '@ionic/angular/standalone';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton],
  styleUrl: './page-header.component.scss',
  template: `
    <ion-header class="page-header" [translucent]="translucent">
      <ion-toolbar>
        @if (showBack) {
          <ion-buttons slot="start">
            <ion-back-button [defaultHref]="backHref" />
          </ion-buttons>
        }
        <ion-title>{{ title }}</ion-title>
        <ng-content slot="end" select="[slot=end]" />
      </ion-toolbar>
    </ion-header>
  `,
})
export class PageHeaderComponent {
  @Input() title = '';
  @Input() showBack = false;
  @Input() backHref = '/';
  @Input() translucent = true;
}
