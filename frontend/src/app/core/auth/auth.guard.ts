import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { KeycloakService } from 'keycloak-angular';

export const authGuard: CanActivateFn = async () => {
  const keycloak = inject(KeycloakService);
  const router = inject(Router);

  const authenticated = await keycloak.isLoggedIn();
  if (!authenticated) {
    await router.navigate(['/login']);
    return false;
  }
  return true;
};
