import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons,
  IonBackButton, IonButton, IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { menuOutline } from 'ionicons/icons';
import { AvatarComponent } from '../avatar/avatar.component';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonButtons,
    IonBackButton, IonButton, IonIcon, AvatarComponent,
  ],
  styleUrl: './page-header.component.scss',
  template: `
    <ion-header class="page-header" [translucent]="translucent">
      <ion-toolbar>
        @if (showMenu) {
          <ion-buttons slot="start">
            <ion-button fill="clear" (click)="menuClick.emit()">
              <ion-icon slot="icon-only" name="menu-outline" />
            </ion-button>
          </ion-buttons>
        } @else if (showBack) {
          <ion-buttons slot="start">
            <ion-back-button [defaultHref]="backHref" />
          </ion-buttons>
        }
        <ion-title>{{ title }}</ion-title>
        <ion-buttons slot="end">
          <ng-content select="[slot=end]" />
          @if (showAvatar) {
            <button class="page-header__avatar-btn" (click)="goToProfile()" aria-label="Profile">
              <app-avatar [name]="userName" size="sm" />
            </button>
          }
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
  `,
})
export class PageHeaderComponent {
  private readonly router = inject(Router);

  @Input() title = '';
  @Input() showBack = false;
  @Input() backHref = '/';
  @Input() translucent = true;
  @Input() showMenu = false;
  @Input() showAvatar = true;
  @Input() userName = '';
  @Output() menuClick = new EventEmitter<void>();

  constructor() { addIcons({ menuOutline }); }

  goToProfile(): void {
    this.router.navigateByUrl('/tabs/profile');
  }
}
