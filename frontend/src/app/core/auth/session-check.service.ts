import { Injectable, NgZone, inject, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { fromEvent } from 'rxjs';
import { KeycloakService } from 'keycloak-angular';

@Injectable({ providedIn: 'root' })
export class SessionCheckService {
  private readonly CHECK_INTERVAL_MS = 60_000;
  private readonly TOKEN_MIN_VALIDITY_SEC = 60;

  private keycloak = inject(KeycloakService);
  private router = inject(Router);
  private ngZone = inject(NgZone);
  private platformId = inject(PLATFORM_ID);

  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.startPeriodicCheck();
      this.setupVisibilityHandler();
    }
  }

  private startPeriodicCheck(): void {
    this.intervalId = setInterval(() => this.check(), this.CHECK_INTERVAL_MS);
  }

  private setupVisibilityHandler(): void {
    fromEvent(document, 'visibilitychange').subscribe(() => {
      if (document.visibilityState === 'visible') this.check();
    });
    fromEvent(window, 'focus').subscribe(() => this.check());
  }

  private async check(): Promise<void> {
    try {
      const loggedIn = await this.keycloak.isLoggedIn();
      if (!loggedIn) return this.redirectToLogin();

      const instance = this.keycloak.getKeycloakInstance();
      await instance.updateToken(this.TOKEN_MIN_VALIDITY_SEC);
    } catch {
      this.redirectToLogin();
    }
  }

  private redirectToLogin(): void {
    this.ngZone.run(() => this.router.navigate(['/login']));
  }
}
