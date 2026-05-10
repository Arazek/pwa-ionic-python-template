import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import {
  IonContent, IonList, IonItem, IonLabel, IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  personOutline, mailOutline, idCardOutline, logOutOutline, shieldCheckmarkOutline,
} from 'ionicons/icons';
import { Store } from '@ngrx/store';
import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

import { AuthService } from '../../core/auth/auth.service';
import { selectUserFullName, selectUserProfile } from '../../store/auth/auth.selectors';
import {
  PageHeaderComponent, SectionComponent, AvatarComponent, DividerComponent,
} from '../../shared';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    AsyncPipe,
    IonContent, IonList, IonItem, IonLabel, IonIcon,
    PageHeaderComponent, SectionComponent, AvatarComponent, DividerComponent,
  ],
  styleUrl: './profile.page.scss',
  template: `
    <app-page-header title="Profile" [userName]="(vm$ | async)?.fullName ?? ''" [showAvatar]="false" />

    <ion-content class="profile-content">
      @if (vm$ | async; as vm) {
        <div class="profile-hero">
          <app-avatar [name]="vm.fullName" size="xl" class="profile-hero__avatar" />
          <h1 class="profile-hero__name">{{ vm.fullName || '—' }}</h1>
          <p class="profile-hero__email">{{ vm.profile?.email || '—' }}</p>
        </div>

        <app-divider />

        <app-section title="Account details">
          <ion-list lines="none" class="profile-list">

            <ion-item class="profile-item">
              <ion-icon slot="start" name="person-outline" class="profile-item__icon" />
              <ion-label>
                <p class="profile-item__label">First name</p>
                <p class="profile-item__value">{{ vm.profile?.firstName || '—' }}</p>
              </ion-label>
            </ion-item>

            <ion-item class="profile-item">
              <ion-icon slot="start" name="person-outline" class="profile-item__icon" />
              <ion-label>
                <p class="profile-item__label">Last name</p>
                <p class="profile-item__value">{{ vm.profile?.lastName || '—' }}</p>
              </ion-label>
            </ion-item>

            <ion-item class="profile-item">
              <ion-icon slot="start" name="mail-outline" class="profile-item__icon" />
              <ion-label>
                <p class="profile-item__label">Email</p>
                <p class="profile-item__value">{{ vm.profile?.email || '—' }}</p>
              </ion-label>
            </ion-item>

            <ion-item class="profile-item">
              <ion-icon slot="start" name="id-card-outline" class="profile-item__icon" />
              <ion-label>
                <p class="profile-item__label">Username</p>
                <p class="profile-item__value">{{ vm.profile?.username || '—' }}</p>
              </ion-label>
            </ion-item>

            <ion-item class="profile-item">
              <ion-icon slot="start" name="shield-checkmark-outline" class="profile-item__icon" />
              <ion-label>
                <p class="profile-item__label">Email verified</p>
                <p class="profile-item__value">{{ vm.profile?.emailVerified ? 'Yes' : 'No' }}</p>
              </ion-label>
            </ion-item>

          </ion-list>
        </app-section>

        <app-divider />

        <app-section title="Session">
          <ion-list lines="none" class="profile-list">
            <ion-item
              class="profile-item profile-item--danger"
              button
              detail="false"
              (click)="logout()"
            >
              <ion-icon slot="start" name="log-out-outline" class="profile-item__icon" />
              <ion-label>Sign out</ion-label>
            </ion-item>
          </ion-list>
        </app-section>
      }
    </ion-content>
  `,
})
export class ProfilePage {
  private readonly store = inject(Store);
  private readonly auth = inject(AuthService);

  readonly vm$ = combineLatest({
    fullName: this.store.select(selectUserFullName),
    profile: this.store.select(selectUserProfile),
  });

  constructor() {
    addIcons({ personOutline, mailOutline, idCardOutline, logOutOutline, shieldCheckmarkOutline });
  }

  logout(): void {
    this.auth.logout();
  }
}
