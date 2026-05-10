import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AuthState } from './auth.state';

export const selectAuthState = createFeatureSelector<AuthState>('auth');

export const selectUserProfile = createSelector(
  selectAuthState,
  (state) => state.profile,
);

export const selectUserFullName = createSelector(
  selectUserProfile,
  (profile) => {
    if (!profile) return '';
    return [profile.firstName, profile.lastName].filter(Boolean).join(' ');
  },
);

export const selectAuthLoading = createSelector(selectAuthState, (s) => s.loading);
export const selectAuthError = createSelector(selectAuthState, (s) => s.error);
