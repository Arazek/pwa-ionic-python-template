# Layout Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 10 layout deficiencies in the Angular/Ionic PWA frontend: remove redundant profile fetching by loading the user profile once into the NgRx store, decouple `PageHeaderComponent` from auth, unify nav item definitions, clarify Settings vs Profile page responsibilities, fix icon inconsistency, make the sidebar brand configurable, and wire the Home page cards.

**Architecture:** Add an `auth` feature slice to the NgRx root store so the Keycloak profile is loaded once at app boot and shared via selectors. All pages and shared components read from the store instead of calling `AuthService.getProfile()` independently. Navigation config moves to a single `nav-items.ts` constant that drives both the desktop sidebar and the mobile tab bar.

**Tech Stack:** Angular 19 standalone components, NgRx 19 (store/effects/selectors), Ionic 8, keycloak-angular, TypeScript strict mode, Karma + Jasmine (Angular CLI default test runner).

---

## File Map

| Status | File | Change |
|--------|------|--------|
| **Create** | `frontend/src/app/store/auth/auth.state.ts` | `UserProfile` interface + `AuthState` + `initialAuthState` |
| **Create** | `frontend/src/app/store/auth/auth.actions.ts` | `AuthActions` action group (loadProfile / success / failure) |
| **Create** | `frontend/src/app/store/auth/auth.reducer.ts` | Pure reducer for auth state |
| **Create** | `frontend/src/app/store/auth/auth.selectors.ts` | `selectUserProfile`, `selectUserFullName` |
| **Create** | `frontend/src/app/store/auth/auth.effects.ts` | Effect that calls `AuthService.getProfile()` once |
| **Create** | `frontend/src/app/store/auth/auth.reducer.spec.ts` | Reducer unit tests |
| **Create** | `frontend/src/app/store/auth/auth.selectors.spec.ts` | Selector unit tests |
| **Create** | `frontend/src/app/core/layout/nav-items.ts` | `NAV_ITEMS` constant shared by sidebar + tab bar |
| **Modify** | `frontend/src/app/store/index.ts` | Register `auth` reducer + `AuthEffects` |
| **Modify** | `frontend/src/app/app.component.ts` | Dispatch `AuthActions.loadProfile()` on boot |
| **Modify** | `frontend/src/app/shared/components/page-header/page-header.component.ts` | Remove `AuthService` injection; add `@Input() userName` |
| **Modify** | `frontend/src/app/shared/components/sidebar/sidebar.component.ts` | Add `@Input() brand` |
| **Modify** | `frontend/src/app/core/layout/app-layout.component.ts` | Use `NAV_ITEMS`; pass `brand` + `userName` inputs; fix icons |
| **Modify** | `frontend/src/app/features/home/home.page.ts` | Use store selector; wire cards with `routerLink` |
| **Modify** | `frontend/src/app/features/settings/settings.page.ts` | Remove profile hero + sign-out; appearance only |
| **Modify** | `frontend/src/app/features/profile/profile.page.ts` | Use store selector |

---

## Task 1: Auth NgRx store slice

**Goal:** Load the Keycloak user profile exactly once (at app boot) and make it available to the whole app via the store.

**Files:**
- Create: `frontend/src/app/store/auth/auth.state.ts`
- Create: `frontend/src/app/store/auth/auth.actions.ts`
- Create: `frontend/src/app/store/auth/auth.reducer.ts`
- Create: `frontend/src/app/store/auth/auth.selectors.ts`
- Create: `frontend/src/app/store/auth/auth.effects.ts`
- Create: `frontend/src/app/store/auth/auth.reducer.spec.ts`
- Create: `frontend/src/app/store/auth/auth.selectors.spec.ts`
- Modify: `frontend/src/app/store/index.ts`
- Modify: `frontend/src/app/app.component.ts`

---

- [ ] **Step 1.1 — Write the reducer tests (they will fail because the files don't exist yet)**

Create `frontend/src/app/store/auth/auth.reducer.spec.ts`:

```ts
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
```

- [ ] **Step 1.2 — Write the selector tests**

Create `frontend/src/app/store/auth/auth.selectors.spec.ts`:

```ts
import { selectUserFullName, selectUserProfile } from './auth.selectors';
import { initialAuthState } from './auth.state';

const profile = {
  firstName: 'Ada', lastName: 'Lovelace',
  email: 'ada@example.com', username: 'ada', emailVerified: true,
};

describe('selectUserProfile', () => {
  it('returns null when no profile loaded', () => {
    expect(selectUserProfile.projector(initialAuthState)).toBeNull();
  });

  it('returns the profile when loaded', () => {
    expect(selectUserProfile.projector({ ...initialAuthState, profile })).toEqual(profile);
  });
});

describe('selectUserFullName', () => {
  it('returns empty string when profile is null', () => {
    expect(selectUserFullName.projector(null)).toBe('');
  });

  it('joins first and last name', () => {
    expect(selectUserFullName.projector(profile)).toBe('Ada Lovelace');
  });

  it('returns only first name when last name is empty', () => {
    expect(selectUserFullName.projector({ ...profile, lastName: '' })).toBe('Ada');
  });

  it('returns only last name when first name is empty', () => {
    expect(selectUserFullName.projector({ ...profile, firstName: '' })).toBe('Lovelace');
  });
});
```

- [ ] **Step 1.3 — Run tests to confirm they fail (files don't exist yet)**

```bash
cd frontend && npx ng test --watch=false 2>&1 | grep -E 'FAILED|ERROR|Cannot find'
```

Expected: compilation errors referencing missing `auth.reducer`, `auth.actions`, `auth.state`, `auth.selectors`.

- [ ] **Step 1.4 — Create auth.state.ts**

```ts
export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  emailVerified: boolean;
}

export interface AuthState {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
}

export const initialAuthState: AuthState = {
  profile: null,
  loading: false,
  error: null,
};
```

- [ ] **Step 1.5 — Create auth.actions.ts**

```ts
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
```

- [ ] **Step 1.6 — Create auth.reducer.ts**

```ts
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
```

- [ ] **Step 1.7 — Create auth.selectors.ts**

```ts
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
```

- [ ] **Step 1.8 — Create auth.effects.ts**

```ts
import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { from, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { AuthActions } from './auth.actions';
import { AuthService } from '../../core/auth/auth.service';

@Injectable()
export class AuthEffects {
  constructor(
    private actions$: Actions,
    private auth: AuthService,
  ) {}

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
            of(AuthActions.loadProfileFailure({ error: String(err) })),
          ),
        ),
      ),
    ),
  );
}
```

- [ ] **Step 1.9 — Register auth in the root store (`store/index.ts`)**

Replace the entire file:

```ts
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
```

- [ ] **Step 1.10 — Dispatch `loadProfile` from `AppComponent`**

Replace `frontend/src/app/app.component.ts`:

```ts
import { Component, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { Store } from '@ngrx/store';

import { ThemeService } from './core/theme/theme.service';
import { SessionCheckService } from './core/auth/session-check.service';
import { AuthActions } from './store/auth/auth.actions';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [IonApp, IonRouterOutlet],
  template: `<ion-app><ion-router-outlet /></ion-app>`,
})
export class AppComponent {
  constructor() {
    inject(ThemeService);
    inject(SessionCheckService);
    inject(Store).dispatch(AuthActions.loadProfile());
  }
}
```

- [ ] **Step 1.11 — Run tests to confirm they pass**

```bash
cd frontend && npx ng test --watch=false 2>&1 | grep -E 'SUMMARY|FAILED|SUCCESS|spec'
```

Expected: reducer and selector specs all PASS. No compilation errors.

- [ ] **Step 1.12 — Confirm the app still compiles**

```bash
cd frontend && npx ng build --configuration=development 2>&1 | tail -5
```

Expected: `Build at:` line with no errors.

- [ ] **Step 1.13 — Commit**

```bash
git add frontend/src/app/store/ frontend/src/app/app.component.ts
git commit -m "feat(frontend): add auth NgRx store slice — load profile once at boot"
```

---

## Task 2: Decouple `PageHeaderComponent` from auth

**Goal:** Remove `AuthService` and `ngOnInit` from `PageHeaderComponent`. Accept `userName` as an `@Input()` instead of self-loading the profile.

**Files:**
- Modify: `frontend/src/app/shared/components/page-header/page-header.component.ts`
- Modify: `frontend/src/app/features/home/home.page.ts` (pass `userName`)
- Modify: `frontend/src/app/features/settings/settings.page.ts` (pass `userName`)
- Modify: `frontend/src/app/features/profile/profile.page.ts` (pass `userName`)
- Modify: `frontend/src/app/features/example/pages/example-detail/example-detail.page.ts` (pass `userName`)
- Modify: `frontend/src/app/features/example/pages/example-list/example-list.page.ts` (pass `userName`)

---

- [ ] **Step 2.1 — Rewrite `PageHeaderComponent`**

Replace `frontend/src/app/shared/components/page-header/page-header.component.ts`:

```ts
import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons,
  IonBackButton, IonButton, IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { menuOutline } from 'ionicons/icons';
import { AvatarComponent } from '../avatar/avatar.component';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonButtons,
    IonBackButton, IonButton, IonIcon, AvatarComponent,
  ],
  styleUrl: './page-header.component.scss',
  template: `
    <ion-header class="page-header" [translucent]="translucent">
      <ion-toolbar>
        @if (showMenu) {
          <ion-buttons slot="start">
            <ion-button fill="clear" (click)="menuClick.emit()">
              <ion-icon slot="icon-only" name="menu-outline" />
            </ion-button>
          </ion-buttons>
        } @else if (showBack) {
          <ion-buttons slot="start">
            <ion-back-button [defaultHref]="backHref" />
          </ion-buttons>
        }
        <ion-title>{{ title }}</ion-title>
        <ion-buttons slot="end">
          <ng-content select="[slot=end]" />
          @if (showAvatar) {
            <button class="page-header__avatar-btn" (click)="goToProfile()" aria-label="Profile">
              <app-avatar [name]="userName" size="sm" />
            </button>
          }
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
  `,
})
export class PageHeaderComponent {
  private router = inject(Router);

  @Input() title = '';
  @Input() showBack = false;
  @Input() backHref = '/';
  @Input() translucent = true;
  @Input() showMenu = false;
  @Input() showAvatar = true;
  @Input() userName = '';
  @Output() menuClick = new EventEmitter<void>();

  constructor() { addIcons({ menuOutline }); }

  goToProfile(): void {
    this.router.navigateByUrl('/tabs/profile');
  }
}
```

- [ ] **Step 2.2 — Update `HomePage` to select `fullName` from the store and pass it to the header**

Replace `frontend/src/app/features/home/home.page.ts`:

```ts
import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { Store } from '@ngrx/store';

import { selectUserFullName, selectUserProfile } from '../../store/auth/auth.selectors';
import { PageHeaderComponent, SectionComponent, CardComponent } from '../../shared';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [AsyncPipe, RouterLink, IonContent, PageHeaderComponent, SectionComponent, CardComponent],
  styleUrl: './home.page.scss',
  template: `
    <app-page-header title="Home" [userName]="(fullName$ | async) ?? ''" />

    <ion-content class="home-content">

      <div class="home-greeting">
        <p class="home-greeting__label">Welcome back,</p>
        <h1 class="home-greeting__name">{{ (profile$ | async)?.firstName || 'there' }}</h1>
      </div>

      <app-section title="Quick actions">
        <div class="home-cards">
          <app-card class="home-card" routerLink="/tabs/example">
            <div class="home-card__body">
              <p class="home-card__label">Browse</p>
              <p class="home-card__sub">View all items</p>
            </div>
          </app-card>
          <app-card class="home-card" routerLink="/tabs/settings">
            <div class="home-card__body">
              <p class="home-card__label">Settings</p>
              <p class="home-card__sub">Theme & account</p>
            </div>
          </app-card>
        </div>
      </app-section>

    </ion-content>
  `,
})
export class HomePage {
  private store = inject(Store);
  readonly fullName$ = this.store.select(selectUserFullName);
  readonly profile$ = this.store.select(selectUserProfile);
}
```

> Note: `CardComponent` needs to forward the `routerLink` click — verify it renders as a clickable element. If `app-card` is a `div`-wrapper, add `style="cursor:pointer"` via the host or wrap in a `<a [routerLink]>`. Check [card.component.ts](frontend/src/app/shared/components/card/card.component.ts) before this step and adjust if needed.

- [ ] **Step 2.3 — Update `SettingsPage` to pass `userName` to the header**

In `frontend/src/app/features/settings/settings.page.ts`, add the store import and replace the class. Only change the header binding and class body — the template body stays the same for now (Task 5 will clean it up):

```ts
import { Component, inject, OnInit } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import {
  IonContent, IonList, IonItem, IonLabel,
  IonSegment, IonSegmentButton, IonIcon, IonRippleEffect,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { logOutOutline, chevronForward } from 'ionicons/icons';
import { Store } from '@ngrx/store';

import { ThemeService, ColorScheme, Accent } from '../../core/theme/theme.service';
import { AuthService } from '../../core/auth/auth.service';
import { selectUserFullName } from '../../store/auth/auth.selectors';
import {
  PageHeaderComponent, SectionComponent, DividerComponent, AvatarComponent,
} from '../../shared';

interface AccentOption { value: Accent; color: string; label: string; }

const ACCENT_OPTIONS: AccentOption[] = [
  { value: null,    color: '#3880ff', label: 'Blue'  },
  { value: 'clay',  color: '#b5603a', label: 'Clay'  },
  { value: 'moss',  color: '#4a7c59', label: 'Moss'  },
  { value: 'dune',  color: '#9b7b4e', label: 'Dune'  },
  { value: 'slate', color: '#5b7fa6', label: 'Slate' },
];

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    AsyncPipe,
    IonContent, IonList, IonItem, IonLabel,
    IonSegment, IonSegmentButton, IonIcon, IonRippleEffect,
    PageHeaderComponent, SectionComponent, DividerComponent, AvatarComponent,
  ],
  styleUrl: './settings.page.scss',
  template: `
    <app-page-header title="Settings" [userName]="(fullName$ | async) ?? ''" />

    <ion-content class="settings-content">

      <!-- Profile -->
      <div class="settings-profile">
        <app-avatar [name]="(fullName$ | async) ?? ''" size="xl" />
        <div class="settings-profile__info">
          <p class="settings-profile__name">{{ (fullName$ | async) }}</p>
        </div>
      </div>

      <app-divider />

      <!-- Appearance -->
      <app-section title="Appearance">
        <ion-list lines="none" class="settings-list">

          <ion-item class="settings-item">
            <ion-label>Color scheme</ion-label>
            <ion-segment
              class="settings-segment"
              [value]="theme.scheme()"
              (ionChange)="onSchemeChange($event)"
            >
              <ion-segment-button value="light">Light</ion-segment-button>
              <ion-segment-button value="system">Auto</ion-segment-button>
              <ion-segment-button value="dark">Dark</ion-segment-button>
            </ion-segment>
          </ion-item>

          <ion-item class="settings-item">
            <ion-label>Accent color</ion-label>
            <div class="accent-picker">
              @for (opt of accentOptions; track opt.label) {
                <button
                  class="accent-swatch ion-activatable"
                  [class.accent-swatch--active]="theme.accent() === opt.value"
                  [style.--swatch-color]="opt.color"
                  [attr.aria-label]="opt.label"
                  (click)="onAccentChange(opt.value)"
                >
                  <ion-ripple-effect />
                </button>
              }
            </div>
          </ion-item>

        </ion-list>
      </app-section>

      <app-divider />

      <!-- Account -->
      <app-section title="Account">
        <ion-list lines="none" class="settings-list">
          <ion-item
            class="settings-item settings-item--danger"
            button
            detail="false"
            (click)="logout()"
          >
            <ion-icon slot="start" name="log-out-outline" />
            <ion-label>Sign out</ion-label>
          </ion-item>
        </ion-list>
      </app-section>

    </ion-content>
  `,
})
export class SettingsPage {
  readonly theme = inject(ThemeService);
  readonly accentOptions = ACCENT_OPTIONS;
  readonly fullName$ = inject(Store).select(selectUserFullName);

  constructor(private auth: AuthService) {
    addIcons({ logOutOutline, chevronForward });
  }

  onSchemeChange(event: CustomEvent): void {
    this.theme.setScheme(event.detail.value as ColorScheme);
  }

  onAccentChange(accent: Accent): void {
    this.theme.setAccent(accent);
  }

  logout(): void {
    this.auth.logout();
  }
}
```

- [ ] **Step 2.4 — Update `ProfilePage` to use store**

Replace `frontend/src/app/features/profile/profile.page.ts`:

```ts
import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import {
  IonContent, IonList, IonItem, IonLabel, IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  personOutline, mailOutline, idCardOutline, logOutOutline, shieldCheckmarkOutline,
} from 'ionicons/icons';
import { Store } from '@ngrx/store';

import { AuthService } from '../../core/auth/auth.service';
import { selectUserFullName, selectUserProfile } from '../../store/auth/auth.selectors';
import {
  PageHeaderComponent, SectionComponent, AvatarComponent, DividerComponent,
} from '../../shared';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    AsyncPipe,
    IonContent, IonList, IonItem, IonLabel, IonIcon,
    PageHeaderComponent, SectionComponent, AvatarComponent, DividerComponent,
  ],
  styleUrl: './profile.page.scss',
  template: `
    <app-page-header title="Profile" [userName]="(fullName$ | async) ?? ''" [showAvatar]="false" />

    <ion-content class="profile-content">

      <div class="profile-hero">
        <app-avatar [name]="(fullName$ | async) ?? ''" size="xl" class="profile-hero__avatar" />
        <h1 class="profile-hero__name">{{ (fullName$ | async) || '—' }}</h1>
        <p class="profile-hero__email">{{ (profile$ | async)?.email || '—' }}</p>
      </div>

      <app-divider />

      <app-section title="Account details">
        <ion-list lines="none" class="profile-list">

          <ion-item class="profile-item">
            <ion-icon slot="start" name="person-outline" class="profile-item__icon" />
            <ion-label>
              <p class="profile-item__label">First name</p>
              <p class="profile-item__value">{{ (profile$ | async)?.firstName || '—' }}</p>
            </ion-label>
          </ion-item>

          <ion-item class="profile-item">
            <ion-icon slot="start" name="person-outline" class="profile-item__icon" />
            <ion-label>
              <p class="profile-item__label">Last name</p>
              <p class="profile-item__value">{{ (profile$ | async)?.lastName || '—' }}</p>
            </ion-label>
          </ion-item>

          <ion-item class="profile-item">
            <ion-icon slot="start" name="mail-outline" class="profile-item__icon" />
            <ion-label>
              <p class="profile-item__label">Email</p>
              <p class="profile-item__value">{{ (profile$ | async)?.email || '—' }}</p>
            </ion-label>
          </ion-item>

          <ion-item class="profile-item">
            <ion-icon slot="start" name="id-card-outline" class="profile-item__icon" />
            <ion-label>
              <p class="profile-item__label">Username</p>
              <p class="profile-item__value">{{ (profile$ | async)?.username || '—' }}</p>
            </ion-label>
          </ion-item>

          <ion-item class="profile-item">
            <ion-icon slot="start" name="shield-checkmark-outline" class="profile-item__icon" />
            <ion-label>
              <p class="profile-item__label">Email verified</p>
              <p class="profile-item__value">{{ (profile$ | async)?.emailVerified ? 'Yes' : 'No' }}</p>
            </ion-label>
          </ion-item>

        </ion-list>
      </app-section>

      <app-divider />

      <app-section title="Session">
        <ion-list lines="none" class="profile-list">
          <ion-item
            class="profile-item profile-item--danger"
            button
            detail="false"
            (click)="logout()"
          >
            <ion-icon slot="start" name="log-out-outline" class="profile-item__icon" />
            <ion-label>Sign out</ion-label>
          </ion-item>
        </ion-list>
      </app-section>

    </ion-content>
  `,
})
export class ProfilePage {
  private auth = inject(AuthService);
  private store = inject(Store);

  readonly fullName$ = this.store.select(selectUserFullName);
  readonly profile$ = this.store.select(selectUserProfile);

  constructor() {
    addIcons({ personOutline, mailOutline, idCardOutline, logOutOutline, shieldCheckmarkOutline });
  }

  logout(): void {
    this.auth.logout();
  }
}
```

- [ ] **Step 2.5 — Update `ExampleListPage` to pass `userName` to header**

In `frontend/src/app/features/example/pages/example-list/example-list.page.ts`, add the store + selector and update only the header binding:

```ts
import { Component, OnInit, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import {
  IonContent,
  IonList, IonItem, IonLabel,
  IonFab, IonFabButton, IonIcon, IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add } from 'ionicons/icons';

import { ExampleActions } from '../../store/example.actions';
import { selectAllItems, selectLoading } from '../../store/example.selectors';
import { selectUserFullName } from '../../../../store/auth/auth.selectors';
import { PageHeaderComponent } from '../../../../shared';

@Component({
  selector: 'app-example-list',
  standalone: true,
  imports: [
    AsyncPipe, RouterLink,
    IonContent,
    IonList, IonItem, IonLabel,
    IonFab, IonFabButton, IonIcon, IonSpinner,
    PageHeaderComponent,
  ],
  template: `
    <app-page-header title="Items" [userName]="(fullName$ | async) ?? ''" />

    <ion-content>
      @if (loading$ | async) {
        <ion-spinner name="crescent" />
      }

      <ion-list>
        @for (item of items$ | async; track item.id) {
          <ion-item [routerLink]="[item.id]" button detail>
            <ion-label>
              <h2>{{ item.title }}</h2>
              <p>{{ item.description }}</p>
            </ion-label>
          </ion-item>
        }
      </ion-list>

      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button (click)="createItem()">
          <ion-icon name="add" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  `,
})
export class ExampleListPage implements OnInit {
  private store = inject(Store);

  readonly items$ = this.store.select(selectAllItems);
  readonly loading$ = this.store.select(selectLoading);
  readonly fullName$ = this.store.select(selectUserFullName);

  constructor() { addIcons({ add }); }

  ngOnInit(): void {
    this.store.dispatch(ExampleActions.loadItems());
  }

  createItem(): void {
    this.store.dispatch(
      ExampleActions.createItem({ title: 'New Item', description: 'Description' }),
    );
  }
}
```

- [ ] **Step 2.6 — Update `ExampleDetailPage` to pass `userName` to header**

In `frontend/src/app/features/example/pages/example-detail/example-detail.page.ts`:

```ts
import { Component, OnInit, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { IonContent, IonButton } from '@ionic/angular/standalone';

import { ExampleActions } from '../../store/example.actions';
import { selectSelectedItem } from '../../store/example.selectors';
import { selectUserFullName } from '../../../../store/auth/auth.selectors';
import { PageHeaderComponent } from '../../../../shared';

@Component({
  selector: 'app-example-detail',
  standalone: true,
  imports: [AsyncPipe, IonContent, IonButton, PageHeaderComponent],
  template: `
    <app-page-header
      [title]="(item$ | async)?.title || 'Item Detail'"
      [showBack]="true"
      backHref="/tabs/example"
      [showAvatar]="false"
      [userName]="(fullName$ | async) ?? ''"
    >
      <ion-button slot="end" color="danger" (click)="delete()">Delete</ion-button>
    </app-page-header>

    <ion-content class="ion-padding">
      @if (item$ | async; as item) {
        <h2>{{ item.title }}</h2>
        <p>{{ item.description }}</p>
      }
    </ion-content>
  `,
})
export class ExampleDetailPage implements OnInit {
  private store = inject(Store);
  private route = inject(ActivatedRoute);

  readonly item$ = this.store.select(selectSelectedItem);
  readonly fullName$ = this.store.select(selectUserFullName);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.store.dispatch(ExampleActions.selectItem({ id }));
  }

  delete(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.store.dispatch(ExampleActions.deleteItem({ id }));
  }
}
```

- [ ] **Step 2.7 — Build to confirm no compilation errors**

```bash
cd frontend && npx ng build --configuration=development 2>&1 | tail -10
```

Expected: clean build, no errors.

- [ ] **Step 2.8 — Commit**

```bash
git add frontend/src/app/shared/components/page-header/ \
        frontend/src/app/features/home/home.page.ts \
        frontend/src/app/features/settings/settings.page.ts \
        frontend/src/app/features/profile/profile.page.ts \
        frontend/src/app/features/example/
git commit -m "refactor(frontend): decouple PageHeader from auth — accept userName as input"
```

---

## Task 3: Single nav source of truth + icon consistency + sidebar brand input

**Goal:** Extract nav config to `nav-items.ts`. Drive both the sidebar array and the tab bar buttons from the same constant. Fix the filled vs outline icon mismatch. Make the sidebar brand label configurable via `@Input()`.

**Files:**
- Create: `frontend/src/app/core/layout/nav-items.ts`
- Modify: `frontend/src/app/shared/components/sidebar/sidebar.component.ts`
- Modify: `frontend/src/app/core/layout/app-layout.component.ts`

---

- [ ] **Step 3.1 — Create `nav-items.ts`**

Create `frontend/src/app/core/layout/nav-items.ts`:

```ts
import { SidebarItem } from '../../shared';

export interface NavItem extends SidebarItem {
  tab: string;
  icon: string;
  iconActive: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Home',
    tab: 'home',
    route: '/tabs/home',
    icon: 'home-outline',
    iconActive: 'home',
  },
  {
    label: 'Items',
    tab: 'example',
    route: '/tabs/example',
    icon: 'list-outline',
    iconActive: 'list',
  },
  {
    label: 'Profile',
    tab: 'profile',
    route: '/tabs/profile',
    icon: 'person-outline',
    iconActive: 'person',
  },
  {
    label: 'Settings',
    tab: 'settings',
    route: '/tabs/settings',
    icon: 'settings-outline',
    iconActive: 'settings-sharp',
  },
];
```

- [ ] **Step 3.2 — Add `@Input() brand` to `SidebarComponent`**

In `frontend/src/app/shared/components/sidebar/sidebar.component.ts`, replace only the `@Input()` declarations section and the template's brand span. The full updated file:

```ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  homeOutline, peopleOutline, settingsOutline, statsChartOutline,
  documentTextOutline, cashOutline, chevronForwardOutline,
  chevronBackOutline, chevronDownOutline, menuOutline,
  shieldOutline, notificationsOutline, helpCircleOutline, listOutline,
} from 'ionicons/icons';

export interface SidebarItem {
  label: string;
  icon: string;
  route?: string;
  badge?: number;
  children?: SidebarItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [IonIcon],
  styleUrl: './sidebar.component.scss',
  template: `
    <nav class="sidebar" [class.sidebar--collapsed]="collapsed">

      <div class="sidebar__header">
        @if (!collapsed) {
          <span class="sidebar__brand">{{ brand }}</span>
        }
        <button class="sidebar__toggle" (click)="toggleCollapsed()" [attr.aria-label]="collapsed ? 'Expand sidebar' : 'Collapse sidebar'">
          <ion-icon [name]="collapsed ? 'chevron-forward-outline' : 'chevron-back-outline'" />
        </button>
      </div>

      <ul class="sidebar__list" role="list">
        @for (item of items; track item.label) {
          <li class="sidebar__item">
            <button
              class="sidebar__link"
              [class.sidebar__link--active]="activeRoute === item.route"
              (click)="onItemClick(item)"
              [attr.aria-label]="item.label"
              [attr.title]="collapsed ? item.label : null"
            >
              <ion-icon class="sidebar__icon" [name]="item.icon" />
              @if (!collapsed) {
                <span class="sidebar__label">{{ item.label }}</span>
                @if (item.badge) {
                  <span class="sidebar__badge">{{ item.badge > 99 ? '99+' : item.badge }}</span>
                }
                @if (item.children?.length) {
                  <ion-icon
                    class="sidebar__chevron"
                    [class.sidebar__chevron--open]="isExpanded(item)"
                    name="chevron-down-outline"
                  />
                }
              } @else {
                @if (item.badge) {
                  <span class="sidebar__badge sidebar__badge--dot"></span>
                }
              }
            </button>

            @if (item.children?.length && !collapsed && isExpanded(item)) {
              <ul class="sidebar__children" role="list">
                @for (child of item.children; track child.label) {
                  <li>
                    <button
                      class="sidebar__link sidebar__link--child"
                      [class.sidebar__link--active]="activeRoute === child.route"
                      (click)="onItemClick(child)"
                    >
                      <ion-icon class="sidebar__icon sidebar__icon--sm" [name]="child.icon" />
                      <span class="sidebar__label">{{ child.label }}</span>
                      @if (child.badge) {
                        <span class="sidebar__badge">{{ child.badge }}</span>
                      }
                    </button>
                  </li>
                }
              </ul>
            }
          </li>
        }
      </ul>

    </nav>
  `,
})
export class SidebarComponent {
  @Input() items: SidebarItem[] = [];
  @Input() collapsed = false;
  @Input() activeRoute = '';
  @Input() brand = 'App';
  @Output() itemClick = new EventEmitter<SidebarItem>();
  @Output() collapsedChange = new EventEmitter<boolean>();

  private expandedItems = new Set<string>();

  constructor() {
    addIcons({
      homeOutline, peopleOutline, settingsOutline, statsChartOutline,
      documentTextOutline, cashOutline, chevronForwardOutline,
      chevronBackOutline, chevronDownOutline, menuOutline,
      shieldOutline, notificationsOutline, helpCircleOutline, listOutline,
    });
  }

  isExpanded(item: SidebarItem): boolean {
    return this.expandedItems.has(item.label);
  }

  toggleCollapsed(): void {
    this.collapsed = !this.collapsed;
    this.collapsedChange.emit(this.collapsed);
  }

  onItemClick(item: SidebarItem): void {
    if (item.children?.length) {
      if (this.expandedItems.has(item.label)) {
        this.expandedItems.delete(item.label);
      } else {
        this.expandedItems.add(item.label);
      }
    } else {
      this.itemClick.emit(item);
    }
  }
}
```

- [ ] **Step 3.3 — Rewrite `AppLayoutComponent` using `NAV_ITEMS`**

Replace `frontend/src/app/core/layout/app-layout.component.ts`:

```ts
import { Component, inject, signal } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import {
  IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonRouterOutlet,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  homeOutline, home,
  listOutline, list,
  personOutline, person,
  settingsOutline, settingsSharp,
} from 'ionicons/icons';
import { BreakpointService } from '../breakpoint.service';
import { SidebarComponent, SidebarItem } from '../../shared';
import { NAV_ITEMS } from './nav-items';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonRouterOutlet,
    SidebarComponent,
  ],
  styleUrl: './app-layout.component.scss',
  template: `
    <div class="app-layout">
      @if (!breakpoint.isMobile()) {
        <app-sidebar
          brand="PWA Template"
          [items]="navItems"
          [collapsed]="sidebarCollapsed()"
          [activeRoute]="currentUrl()"
          (collapsedChange)="sidebarCollapsed.set($event)"
          (itemClick)="navigate($event)"
        />
      }

      <div class="app-layout__main">
        <ion-tabs class="app-layout__tabs">
          <ion-router-outlet />

          @if (breakpoint.isMobile()) {
            <ion-tab-bar slot="bottom">
              @for (item of navItems; track item.tab) {
                <ion-tab-button [tab]="item.tab" [href]="item.route">
                  <ion-icon [name]="currentUrl() === item.route ? item.iconActive : item.icon" />
                  <ion-label>{{ item.label }}</ion-label>
                </ion-tab-button>
              }
            </ion-tab-bar>
          }
        </ion-tabs>
      </div>
    </div>
  `,
})
export class AppLayoutComponent {
  readonly breakpoint = inject(BreakpointService);
  private router = inject(Router);

  readonly sidebarCollapsed = signal(false);
  readonly currentUrl = signal('');
  readonly navItems = NAV_ITEMS;

  constructor() {
    addIcons({ homeOutline, home, listOutline, list, personOutline, person, settingsOutline, settingsSharp });
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
    ).subscribe(e => this.currentUrl.set(e.urlAfterRedirects));
    this.currentUrl.set(this.router.url);
  }

  navigate(item: SidebarItem): void {
    if (item.route) {
      this.router.navigateByUrl(item.route);
    }
  }
}
```

- [ ] **Step 3.4 — Build to confirm no errors**

```bash
cd frontend && npx ng build --configuration=development 2>&1 | tail -10
```

Expected: clean build.

- [ ] **Step 3.5 — Commit**

```bash
git add frontend/src/app/core/layout/nav-items.ts \
        frontend/src/app/core/layout/app-layout.component.ts \
        frontend/src/app/shared/components/sidebar/sidebar.component.ts
git commit -m "refactor(frontend): single nav source of truth, sidebar brand input, icon consistency"
```

---

## Task 4: Settings = appearance only; Profile = identity + sign out

**Goal:** Remove the profile hero and sign-out from `SettingsPage`. `ProfilePage` already owns both. `SettingsPage` becomes appearance-only. The Profile tab is already added to nav in Task 3.

**Files:**
- Modify: `frontend/src/app/features/settings/settings.page.ts`
- Modify: `frontend/src/app/features/settings/settings.page.scss`

---

- [ ] **Step 4.1 — Strip SettingsPage to appearance only**

Replace `frontend/src/app/features/settings/settings.page.ts`:

```ts
import { Component, inject } from '@angular/core';
import {
  IonContent, IonList, IonItem, IonLabel,
  IonSegment, IonSegmentButton, IonIcon, IonRippleEffect,
} from '@ionic/angular/standalone';
import { AsyncPipe } from '@angular/common';
import { Store } from '@ngrx/store';
import { addIcons } from 'ionicons';

import { ThemeService, ColorScheme, Accent } from '../../core/theme/theme.service';
import { selectUserFullName } from '../../store/auth/auth.selectors';
import { PageHeaderComponent, SectionComponent } from '../../shared';

interface AccentOption { value: Accent; color: string; label: string; }

const ACCENT_OPTIONS: AccentOption[] = [
  { value: null,    color: '#3880ff', label: 'Blue'  },
  { value: 'clay',  color: '#b5603a', label: 'Clay'  },
  { value: 'moss',  color: '#4a7c59', label: 'Moss'  },
  { value: 'dune',  color: '#9b7b4e', label: 'Dune'  },
  { value: 'slate', color: '#5b7fa6', label: 'Slate' },
];

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    AsyncPipe,
    IonContent, IonList, IonItem, IonLabel,
    IonSegment, IonSegmentButton, IonIcon, IonRippleEffect,
    PageHeaderComponent, SectionComponent,
  ],
  styleUrl: './settings.page.scss',
  template: `
    <app-page-header title="Settings" [userName]="(fullName$ | async) ?? ''" />

    <ion-content class="settings-content">

      <app-section title="Appearance">
        <ion-list lines="none" class="settings-list">

          <ion-item class="settings-item">
            <ion-label>Color scheme</ion-label>
            <ion-segment
              class="settings-segment"
              [value]="theme.scheme()"
              (ionChange)="onSchemeChange($event)"
            >
              <ion-segment-button value="light">Light</ion-segment-button>
              <ion-segment-button value="system">Auto</ion-segment-button>
              <ion-segment-button value="dark">Dark</ion-segment-button>
            </ion-segment>
          </ion-item>

          <ion-item class="settings-item">
            <ion-label>Accent color</ion-label>
            <div class="accent-picker">
              @for (opt of accentOptions; track opt.label) {
                <button
                  class="accent-swatch ion-activatable"
                  [class.accent-swatch--active]="theme.accent() === opt.value"
                  [style.--swatch-color]="opt.color"
                  [attr.aria-label]="opt.label"
                  (click)="onAccentChange(opt.value)"
                >
                  <ion-ripple-effect />
                </button>
              }
            </div>
          </ion-item>

        </ion-list>
      </app-section>

    </ion-content>
  `,
})
export class SettingsPage {
  readonly theme = inject(ThemeService);
  readonly accentOptions = ACCENT_OPTIONS;
  readonly fullName$ = inject(Store).select(selectUserFullName);

  constructor() { addIcons({}); }

  onSchemeChange(event: CustomEvent): void {
    this.theme.setScheme(event.detail.value as ColorScheme);
  }

  onAccentChange(accent: Accent): void {
    this.theme.setAccent(accent);
  }
}
```

- [ ] **Step 4.2 — Clean `settings.page.scss` — remove profile-related rules**

Replace `frontend/src/app/features/settings/settings.page.scss`:

```scss
@use 'theme/variables' as v;

.settings-content {
  --background: var(--ion-background-color);
}

.settings-list {
  --background: transparent;
  padding: 0 8px;
}

.settings-item {
  --background: transparent;
  --padding-start: 12px;
  --inner-padding-end: 12px;
  --min-height: 52px;
  border-radius: 10px;

  ion-label {
    font-size: 15px;
    font-weight: 500;
  }
}

.settings-segment {
  --background: var(--ion-color-light);
  width: 100%;

  @include v.tablet-up {
    width: 180px;
    min-width: 180px;
  }

  ion-segment-button {
    --padding-top: 6px;
    --padding-bottom: 6px;
    font-size: 12px;
    min-width: 0;
  }
}

.accent-picker {
  display: flex;
  gap: 10px;
  align-items: center;
}

.accent-swatch {
  position: relative;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--swatch-color);
  border: 2.5px solid transparent;
  cursor: pointer;
  transition: transform 0.15s, border-color 0.15s;
  overflow: hidden;

  &--active {
    border-color: var(--swatch-color);
    box-shadow: 0 0 0 2px var(--ion-background-color), 0 0 0 4px var(--swatch-color);
    transform: scale(1.15);
  }

  &:active {
    transform: scale(0.9);
  }
}
```

- [ ] **Step 4.3 — Build + run tests**

```bash
cd frontend && npx ng build --configuration=development 2>&1 | tail -5
cd frontend && npx ng test --watch=false 2>&1 | grep -E 'SUMMARY|FAILED|SUCCESS'
```

Expected: clean build, all tests pass.

- [ ] **Step 4.4 — Commit**

```bash
git add frontend/src/app/features/settings/
git commit -m "refactor(frontend): settings = appearance only; profile owns identity + sign out"
```

---

## Self-Review

**Spec coverage check:**

| Improvement | Covered by task |
|---|---|
| Nav items defined twice | Task 3 — `NAV_ITEMS` constant drives both |
| Profile page unreachable via nav | Task 3 — Profile added to `NAV_ITEMS` |
| `getProfile()` called multiple times | Task 1 — dispatched once from AppComponent |
| `fullName` getter duplicated in 4 places | Tasks 2–4 — all pages use `selectUserFullName` |
| Settings and Profile overlapping | Task 4 — clean split |
| Sidebar brand hardcoded | Task 3 — `@Input() brand` + passed from layout |
| PageHeader injects AuthService | Task 2 — replaced with `@Input() userName` |
| Icon inconsistency | Task 3 — `NAV_ITEMS` defines both outline + active variants |
| Home cards are inert | Task 2, Step 2.2 — `routerLink` added |
| Inconsistent reactive pattern | Tasks 2–4 — all pages use `async` pipe with store observables |

**Placeholder scan:** No TBDs or "similar to" references found.

**Type consistency check:**
- `UserProfile` defined in Task 1 (`auth.state.ts`), used consistently in actions, reducer, selectors, and effects.
- `NavItem extends SidebarItem` — `SidebarItem` is the existing interface from `sidebar.component.ts`; `NavItem` adds `tab`, `iconActive`. Both used correctly in `AppLayoutComponent`.
- `selectUserFullName` and `selectUserProfile` defined in Task 1, referenced by name in Tasks 2–4 — consistent.
- `AuthActions.loadProfile()` dispatched in Task 1 (AppComponent), handled by effect in Task 1 — consistent.

> **One thing to verify before Step 2.2:** Open `frontend/src/app/shared/components/card/card.component.ts` and confirm `app-card` renders a clickable host element or passes through `routerLink`. If the host is a plain `div`, the `routerLink` on the element will not work and you should wrap the card content in `<a [routerLink]="...">` instead, or add `routerLink` support to `CardComponent` via `@HostBinding`.
