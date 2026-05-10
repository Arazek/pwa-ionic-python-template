import { createReducer, on } from '@ngrx/store';
import { AuthActions } from './auth.actions';
import { AuthState, initialAuthState } from './auth.state';

export const authReducer = createReducer<AuthState>(
  initialAuthState,
  on(AuthActions.loadProfile, (state) => ({ ...state, loading: true, error: null })),
  on(AuthActions.loadProfileSuccess, (state, { profile }) => ({
    ...state, profile, loading: false,
  })),
  on(AuthActions.loadProfileFailure, (state, { error }) => ({
    ...state, error, loading: false,
  })),
);
