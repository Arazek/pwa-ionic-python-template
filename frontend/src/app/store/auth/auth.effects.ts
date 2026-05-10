import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { inject } from '@angular/core';
import { from, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { AuthService } from '../../core/auth/auth.service';
import { AuthActions } from './auth.actions';

@Injectable()
export class AuthEffects {
  private readonly actions$ = inject(Actions);
  private readonly auth = inject(AuthService);

  loadProfile$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.loadProfile),
      switchMap(() =>
        from(this.auth.getProfile()).pipe(
          map((kc) => AuthActions.loadProfileSuccess({
            profile: {
              firstName: kc.firstName ?? '',
              lastName: kc.lastName ?? '',
              email: kc.email ?? '',
              username: kc.username ?? '',
              emailVerified: kc.emailVerified ?? false,
            },
          })),
          catchError((err) =>
            of(AuthActions.loadProfileFailure({
              error: err instanceof Error ? err.message : String(err),
            })),
          ),
        ),
      ),
    ),
  );
}
