import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { UserProfile } from './auth.state';

export const AuthActions = createActionGroup({
  source: 'Auth',
  events: {
    'Load Profile': emptyProps(),
    'Load Profile Success': props<{ profile: UserProfile }>(),
    'Load Profile Failure': props<{ error: string }>(),
  },
});
