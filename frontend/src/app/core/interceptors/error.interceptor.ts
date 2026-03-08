import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { KeycloakService } from 'keycloak-angular';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const keycloak = inject(KeycloakService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      console.log('[errorInterceptor] status:', error.status, '| url:', req.url);
      if (error.status === 401) {
        return from(keycloak.isLoggedIn()).pipe(
          switchMap((authenticated) => {
            console.log('[errorInterceptor] 401 — authenticated:', authenticated);
            if (!authenticated) {
              console.log('[errorInterceptor] navigating to /login');
              router.navigate(['/login']);
            }
            return throwError(() => error);
          }),
        );
      }
      return throwError(() => error);
    }),
  );
};
