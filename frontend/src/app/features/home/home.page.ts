import { Component, OnInit } from '@angular/core';
import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonButton,
} from '@ionic/angular/standalone';
import { AuthService } from '../../core/auth/auth.service';
import { KeycloakProfile } from 'keycloak-js';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, IonButton],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Home</ion-title>
        <ion-button slot="end" fill="clear" (click)="logout()">Logout</ion-button>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <h2>Welcome{{ profile ? ', ' + profile.firstName : '' }}!</h2>
      <p>Your PWA template is running.</p>
    </ion-content>
  `,
})
export class HomePage implements OnInit {
  profile: KeycloakProfile | null = null;

  constructor(private auth: AuthService) {}

  async ngOnInit(): Promise<void> {
    this.profile = await this.auth.getProfile();
  }

  logout(): void {
    this.auth.logout();
  }
}
