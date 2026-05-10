import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { Store } from '@ngrx/store';
import { TranslocoPipe } from '@jsverse/transloco';

import { selectUserFullName, selectUserProfile } from '../../store/auth/auth.selectors';
import { PageHeaderComponent, SectionComponent, CardComponent } from '../../shared';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [AsyncPipe, RouterLink, IonContent, TranslocoPipe, PageHeaderComponent, SectionComponent, CardComponent],
  styleUrl: './home.page.scss',
  template: `
    <app-page-header [title]="'home.title' | transloco" [userName]="(fullName$ | async) ?? ''" />

    <ion-content class="home-content">

      <div class="home-greeting">
        <p class="home-greeting__label">{{ 'home.greeting' | transloco }}</p>
        <h1 class="home-greeting__name">{{ (profile$ | async)?.firstName || ('home.greeting.fallback' | transloco) }}</h1>
      </div>

      <app-section [title]="'home.section.quickActions' | transloco">
        <div class="home-cards">
          <app-card class="home-card" [clickable]="true" routerLink="/tabs/example">
            <div class="home-card__body">
              <p class="home-card__label">{{ 'home.card.browse' | transloco }}</p>
              <p class="home-card__sub">{{ 'home.card.browseDesc' | transloco }}</p>
            </div>
          </app-card>
          <app-card class="home-card" [clickable]="true" routerLink="/tabs/settings">
            <div class="home-card__body">
              <p class="home-card__label">{{ 'home.card.settings' | transloco }}</p>
              <p class="home-card__sub">{{ 'home.card.settingsDesc' | transloco }}</p>
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
