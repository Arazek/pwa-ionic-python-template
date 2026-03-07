import { Component } from '@angular/core';
import {
  IonContent,
  IonButton,
} from '@ionic/angular/standalone';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [IonContent, IonButton],
  template: `
    <ion-content class="ion-padding login-page">
      <div class="login-container">
        <h1>PWA Template</h1>
        <p>Sign in to continue</p>

        <ion-button expand="block" (click)="login()" class="ion-margin-top">
          Sign In
        </ion-button>
      </div>
    </ion-content>
  `,
  styles: [`
    .login-page {
      --background: var(--ion-color-light);
    }
    .login-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      max-width: 360px;
      margin: 0 auto;
      text-align: center;
    }
  `],
})
export class LoginPage {
  constructor(private auth: AuthService) {}

  login(): void {
    this.auth.login();
  }
}
