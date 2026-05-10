import { authReducer } from './auth.reducer';
import { AuthActions } from './auth.actions';
import { initialAuthState } from './auth.state';

describe('authReducer', () => {
  it('returns initial state for unknown action', () => {
    const state = authReducer(undefined, { type: '@@INIT' });
    expect(state).toEqual(initialAuthState);
  });

  it('sets loading=true on loadProfile', () => {
    const state = authReducer(initialAuthState, AuthActions.loadProfile());
    expect(state.loading).toBeTrue();
    expect(state.error).toBeNull();
  });

  it('stores profile and clears loading on loadProfileSuccess', () => {
    const profile = {
      firstName: 'Ada', lastName: 'Lovelace',
      email: 'ada@example.com', username: 'ada', emailVerified: true,
    };
    const state = authReducer(
      { ...initialAuthState, loading: true },
      AuthActions.loadProfileSuccess({ profile }),
    );
    expect(state.profile).toEqual(profile);
    expect(state.loading).toBeFalse();
    expect(state.error).toBeNull();
  });

  it('stores error and clears loading on loadProfileFailure', () => {
    const state = authReducer(
      { ...initialAuthState, loading: true },
      AuthActions.loadProfileFailure({ error: 'Network error' }),
    );
    expect(state.error).toBe('Network error');
    expect(state.loading).toBeFalse();
    expect(state.profile).toBeNull();
  });
});
