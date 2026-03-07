import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { KeycloakService } from 'keycloak-angular';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const keycloak = inject(KeycloakService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        keycloak.login();
      }
      return throwError(() => error);
    }),
  );
};
