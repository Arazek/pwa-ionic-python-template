import { Component, OnInit } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { KeycloakProfile } from 'keycloak-js';

import { AuthService } from '../../core/auth/auth.service';
import {
  PageHeaderComponent, SectionComponent, CardComponent, AvatarComponent,
} from '../../shared';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [IonContent, PageHeaderComponent, SectionComponent, CardComponent, AvatarComponent],
  styleUrl: './home.page.scss',
  template: `
    <app-page-header title="Home">
      <app-avatar slot="end" [name]="fullName" size="sm" style="margin-right: 12px;" />
    </app-page-header>

    <ion-content class="home-content">

      <div class="home-greeting">
        <p class="home-greeting__label">Welcome back,</p>
        <h1 class="home-greeting__name">{{ firstName || 'there' }}</h1>
      </div>

      <app-section title="Quick actions">
        <div class="home-cards">
          <app-card class="home-card">
            <div class="home-card__body">
              <p class="home-card__label">Browse</p>
              <p class="home-card__sub">View all items</p>
            </div>
          </app-card>
          <app-card class="home-card">
            <div class="home-card__body">
              <p class="home-card__label">Settings</p>
              <p class="home-card__sub">Theme & account</p>
            </div>
          </app-card>
        </div>
      </app-section>

    </ion-content>
  `,
})
export class HomePage implements OnInit {
  profile: KeycloakProfile | null = null;

  get fullName(): string {
    if (!this.profile) return '';
    return [this.profile.firstName, this.profile.lastName].filter(Boolean).join(' ');
  }

  get firstName(): string {
    return this.profile?.firstName ?? '';
  }

  constructor(private auth: AuthService) {}

  async ngOnInit(): Promise<void> {
    this.profile = await this.auth.getProfile();
  }
}
