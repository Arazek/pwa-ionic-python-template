import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { Store } from '@ngrx/store';

import { selectUserFullName, selectUserProfile } from '../../store/auth/auth.selectors';
import { PageHeaderComponent, SectionComponent, CardComponent } from '../../shared';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [AsyncPipe, RouterLink, IonContent, PageHeaderComponent, SectionComponent, CardComponent],
  styleUrl: './home.page.scss',
  template: `
    <app-page-header title="Home" [userName]="(fullName$ | async) ?? ''" />

    <ion-content class="home-content">

      <div class="home-greeting">
        <p class="home-greeting__label">Welcome back,</p>
        <h1 class="home-greeting__name">{{ (profile$ | async)?.firstName || 'there' }}</h1>
      </div>

      <app-section title="Quick actions">
        <div class="home-cards">
          <app-card class="home-card" [clickable]="true" routerLink="/tabs/example">
            <div class="home-card__body">
              <p class="home-card__label">Browse</p>
              <p class="home-card__sub">View all items</p>
            </div>
          </app-card>
          <app-card class="home-card" [clickable]="true" routerLink="/tabs/settings">
            <div class="home-card__body">
              <p class="home-card__label">Settings</p>
              <p class="home-card__sub">Appearance</p>
            </div>
          </app-card>
        </div>
      </app-section>

    </ion-content>
  `,
})
export class HomePage {
  private readonly store = inject(Store);
  readonly fullName$ = this.store.select(selectUserFullName);
  readonly profile$ = this.store.select(selectUserProfile);
}
