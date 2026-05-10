import { ActionReducerMap } from '@ngrx/store';
import { routerReducer, RouterReducerState } from '@ngrx/router-store';
import { exampleReducer } from '../features/example/store/example.reducer';
import { ExampleState } from '../features/example/store/example.state';
import { ExampleEffects } from '../features/example/store/example.effects';
import { authReducer } from './auth/auth.reducer';
import { AuthState } from './auth/auth.state';
import { AuthEffects } from './auth/auth.effects';

export interface AppState {
  router: RouterReducerState;
  example: ExampleState;
  auth: AuthState;
}

export const rootReducers: ActionReducerMap<AppState> = {
  router: routerReducer,
  example: exampleReducer,
  auth: authReducer,
};

export const rootEffects = [ExampleEffects, AuthEffects];
