import { Component, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { Store } from '@ngrx/store';

import { ThemeService } from './core/theme/theme.service';
import { SessionCheckService } from './core/auth/session-check.service';
import { AuthActions } from './store/auth/auth.actions';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [IonApp, IonRouterOutlet],
  template: `<ion-app><ion-router-outlet /></ion-app>`,
})
export class AppComponent {
  private readonly store = inject(Store);

  constructor() {
    inject(ThemeService);
    inject(SessionCheckService);
    this.store.dispatch(AuthActions.loadProfile());
  }
}
