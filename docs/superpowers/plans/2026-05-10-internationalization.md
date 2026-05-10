# Internationalization (i18n) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add runtime language switching to the Angular 19 PWA template using Transloco, with English and Spanish as default locales, and a language picker in the Settings page.

**Architecture:** Install `@jsverse/transloco` and configure it with an HTTP loader that fetches JSON files from `/assets/i18n/`. An `I18nService` in `core/i18n/` wraps `TranslocoService`, persists the chosen locale to `localStorage`, and exposes a reactive `activeLang` signal. All hard-coded UI strings are replaced with `{{ 'key' | transloco }}` bindings. Nav item `label` fields become translation keys so both the sidebar and mobile tab bar auto-translate.

**Tech Stack:** Angular 19 standalone components, `@jsverse/transloco` v7, `TranslocoPipe`, JSON translation files, `localStorage` for persistence, Karma + Jasmine.

---

## File Map

| Status | File | Change |
|--------|------|--------|
| **Create** | `frontend/src/assets/i18n/en.json` | English translations |
| **Create** | `frontend/src/assets/i18n/es.json` | Spanish translations |
| **Create** | `frontend/src/app/core/i18n/transloco-http-loader.ts` | HTTP loader for translation files |
| **Create** | `frontend/src/app/core/i18n/i18n.service.ts` | Language switching + localStorage persistence |
| **Create** | `frontend/src/app/core/i18n/i18n.service.spec.ts` | Unit tests for I18nService |
| **Modify** | `frontend/src/app/app.config.ts` | Add `provideTransloco(...)` provider |
| **Modify** | `frontend/src/app/core/layout/nav-items.ts` | Change `label` to translation key (e.g. `'nav.home'`) |
| **Modify** | `frontend/src/app/core/layout/app-layout.component.ts` | Import `TranslocoPipe`; translate tab bar labels |
| **Modify** | `frontend/src/app/shared/components/sidebar/sidebar.component.ts` | Import `TranslocoPipe`; translate `item.label` |
| **Modify** | `frontend/src/app/features/settings/settings.page.ts` | Add Language section; import `I18nService` + `TranslocoPipe` |
| **Modify** | `frontend/src/app/features/home/home.page.ts` | Replace hard-coded strings with transloco pipe |
| **Modify** | `frontend/src/app/features/profile/profile.page.ts` | Replace hard-coded strings with transloco pipe |
| **Modify** | `frontend/src/app/features/example/pages/example-list/example-list.page.ts` | Translate page title |
| **Modify** | `frontend/src/app/features/example/pages/example-detail/example-detail.page.ts` | Translate fallback title and button |

---

## Task 1: Install Transloco + translation files + I18nService

**Goal:** Install `@jsverse/transloco`, create the English and Spanish JSON files with all app strings, add the HTTP loader, and create `I18nService` with its unit tests.

**Files:**
- Create: `frontend/src/assets/i18n/en.json`
- Create: `frontend/src/assets/i18n/es.json`
- Create: `frontend/src/app/core/i18n/transloco-http-loader.ts`
- Create: `frontend/src/app/core/i18n/i18n.service.ts`
- Create: `frontend/src/app/core/i18n/i18n.service.spec.ts`

---

- [ ] **Step 1.1 — Install Transloco**

```bash
cd frontend && npm install @jsverse/transloco
```

Expected: package added, no peer-dependency errors.

- [ ] **Step 1.2 — Create the English translation file**

Create `frontend/src/assets/i18n/en.json`:

```json
{
  "nav": {
    "home": "Home",
    "items": "Items",
    "profile": "Profile",
    "settings": "Settings"
  },
  "home": {
    "title": "Home",
    "greeting": "Welcome back,",
    "greeting.fallback": "there",
    "section.quickActions": "Quick actions",
    "card.browse": "Browse",
    "card.browseDesc": "View all items",
    "card.settings": "Settings",
    "card.settingsDesc": "Appearance"
  },
  "profile": {
    "title": "Profile",
    "section.details": "Account details",
    "section.session": "Session",
    "field.firstName": "First name",
    "field.lastName": "Last name",
    "field.email": "Email",
    "field.username": "Username",
    "field.emailVerified": "Email verified",
    "emailVerified.yes": "Yes",
    "emailVerified.no": "No",
    "signOut": "Sign out"
  },
  "settings": {
    "title": "Settings",
    "section.appearance": "Appearance",
    "section.language": "Language",
    "colorScheme": "Color scheme",
    "colorScheme.light": "Light",
    "colorScheme.auto": "Auto",
    "colorScheme.dark": "Dark",
    "accentColor": "Accent color",
    "language": "Language"
  },
  "items": {
    "title": "Items",
    "detail.title": "Item"
  },
  "common": {
    "delete": "Delete"
  }
}
```

- [ ] **Step 1.3 — Create the Spanish translation file**

Create `frontend/src/assets/i18n/es.json`:

```json
{
  "nav": {
    "home": "Inicio",
    "items": "Elementos",
    "profile": "Perfil",
    "settings": "Ajustes"
  },
  "home": {
    "title": "Inicio",
    "greeting": "Bienvenido,",
    "greeting.fallback": "ahí",
    "section.quickActions": "Acciones rápidas",
    "card.browse": "Explorar",
    "card.browseDesc": "Ver todos los elementos",
    "card.settings": "Ajustes",
    "card.settingsDesc": "Apariencia"
  },
  "profile": {
    "title": "Perfil",
    "section.details": "Detalles de cuenta",
    "section.session": "Sesión",
    "field.firstName": "Nombre",
    "field.lastName": "Apellido",
    "field.email": "Correo electrónico",
    "field.username": "Nombre de usuario",
    "field.emailVerified": "Correo verificado",
    "emailVerified.yes": "Sí",
    "emailVerified.no": "No",
    "signOut": "Cerrar sesión"
  },
  "settings": {
    "title": "Ajustes",
    "section.appearance": "Apariencia",
    "section.language": "Idioma",
    "colorScheme": "Esquema de color",
    "colorScheme.light": "Claro",
    "colorScheme.auto": "Auto",
    "colorScheme.dark": "Oscuro",
    "accentColor": "Color de acento",
    "language": "Idioma"
  },
  "items": {
    "title": "Elementos",
    "detail.title": "Elemento"
  },
  "common": {
    "delete": "Eliminar"
  }
}
```

- [ ] **Step 1.4 — Create the HTTP loader**

Create `frontend/src/app/core/i18n/transloco-http-loader.ts`:

```ts
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslocoLoader } from '@jsverse/transloco';

@Injectable({ providedIn: 'root' })
export class TranslocoHttpLoader implements TranslocoLoader {
  private readonly http = inject(HttpClient);

  getTranslation(lang: string) {
    return this.http.get<Record<string, unknown>>(`/assets/i18n/${lang}.json`);
  }
}
```

- [ ] **Step 1.5 — Write the failing I18nService tests**

Create `frontend/src/app/core/i18n/i18n.service.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { I18nService } from './i18n.service';

describe('I18nService', () => {
  let service: I18nService;
  let transloco: jasmine.SpyObj<TranslocoService>;

  beforeEach(() => {
    localStorage.clear();

    transloco = jasmine.createSpyObj('TranslocoService', [
      'setActiveLang', 'getActiveLang', 'load',
    ]);
    transloco.getActiveLang.and.returnValue('en');
    transloco.load.and.returnValue({ subscribe: () => ({}) } as any);

    TestBed.configureTestingModule({
      providers: [
        I18nService,
        { provide: TranslocoService, useValue: transloco },
      ],
    });

    service = TestBed.inject(I18nService);
  });

  afterEach(() => localStorage.clear());

  it('defaults to "en" when localStorage is empty', () => {
    expect(transloco.setActiveLang).toHaveBeenCalledWith('en');
    expect(service.activeLang()).toBe('en');
  });

  it('restores saved language from localStorage', () => {
    localStorage.setItem('lang', 'es');
    transloco.setActiveLang.calls.reset();

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        I18nService,
        { provide: TranslocoService, useValue: transloco },
      ],
    });
    const fresh = TestBed.inject(I18nService);

    expect(transloco.setActiveLang).toHaveBeenCalledWith('es');
    expect(fresh.activeLang()).toBe('es');
  });

  it('setLang updates activeLang signal and persists to localStorage', () => {
    service.setLang('es');
    expect(transloco.setActiveLang).toHaveBeenCalledWith('es');
    expect(service.activeLang()).toBe('es');
    expect(localStorage.getItem('lang')).toBe('es');
  });

  it('exposes availableLangs with en and es entries', () => {
    expect(service.availableLangs.map((l) => l.code)).toEqual(['en', 'es']);
  });
});
```

- [ ] **Step 1.6 — Run tests to confirm they fail**

```bash
cd frontend && npx ng test --watch=false --include="**/i18n.service.spec.ts" 2>&1 | grep -E "SUMMARY|FAILED|ERROR"
```

Expected: compile error — `I18nService` does not exist yet.

- [ ] **Step 1.7 — Create I18nService**

Create `frontend/src/app/core/i18n/i18n.service.ts`:

```ts
import { inject, Injectable, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

export interface LangOption {
  code: string;
  label: string;
}

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly transloco = inject(TranslocoService);

  readonly availableLangs: LangOption[] = [
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Español' },
  ];

  readonly activeLang = signal(this.transloco.getActiveLang());

  constructor() {
    const saved = localStorage.getItem('lang') ?? 'en';
    this.transloco.load('en').subscribe();
    this.transloco.load('es').subscribe();
    this.setLang(saved);
  }

  setLang(code: string): void {
    this.transloco.setActiveLang(code);
    this.activeLang.set(code);
    localStorage.setItem('lang', code);
  }
}
```

- [ ] **Step 1.8 — Run tests to confirm they pass**

```bash
cd frontend && npx ng test --watch=false --include="**/i18n.service.spec.ts" 2>&1 | grep -E "SUMMARY|FAILED|SUCCESS|spec"
```

Expected: 4 specs, 0 failures.

- [ ] **Step 1.9 — Commit**

```bash
git add frontend/src/assets/i18n/ \
        frontend/src/app/core/i18n/
git commit -m "feat(i18n): add Transloco, translation files (en/es), and I18nService"
```

---

## Task 2: Configure Transloco in app.config.ts

**Goal:** Register `provideTransloco(...)` in the application providers so every component can inject `TranslocoService` and use the `transloco` pipe.

**Files:**
- Modify: `frontend/src/app/app.config.ts`

---

- [ ] **Step 2.1 — Add provideTransloco to app.config.ts**

Replace the full contents of `frontend/src/app/app.config.ts`:

```ts
import { ApplicationConfig, APP_INITIALIZER } from '@angular/core';
import { provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideServiceWorker } from '@angular/service-worker';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideRouterStore } from '@ngrx/router-store';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { provideTransloco } from '@jsverse/transloco';
import { KeycloakAngularModule, KeycloakService } from 'keycloak-angular';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { rootReducers, rootEffects } from './store';
import { environment } from '../environments/environment';
import { TranslocoHttpLoader } from './core/i18n/transloco-http-loader';

function initializeKeycloak(keycloak: KeycloakService) {
  return async () => {
    try {
      await keycloak.init({
        config: environment.keycloak,
        initOptions: {
          onLoad: 'check-sso',
          silentCheckSsoRedirectUri: window.location.origin + '/assets/silent-check-sso.html',
          pkceMethod: 'S256',
        },
        enableBearerInterceptor: false,
      });
    } catch (err) {
      console.error(
        '[Keycloak] Initialization failed. Make sure Keycloak is running and the ' +
        'self-signed cert at ' + environment.keycloak.url + ' is trusted in your browser.',
        err,
      );
    }
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    provideAnimations(),
    provideIonicAngular(),
    provideServiceWorker('ngsw-worker.js', {
      enabled: environment.production,
      registrationStrategy: 'registerWhenStable:30000',
    }),
    provideStore(rootReducers),
    provideEffects(rootEffects),
    provideRouterStore(),
    provideStoreDevtools({ maxAge: 25, logOnly: environment.production }),
    provideTransloco({
      config: {
        availableLangs: ['en', 'es'],
        defaultLang: 'en',
        reRenderOnLangChange: true,
        prodMode: environment.production,
      },
      loader: TranslocoHttpLoader,
    }),
    KeycloakAngularModule,
    KeycloakService,
    {
      provide: APP_INITIALIZER,
      useFactory: initializeKeycloak,
      multi: true,
      deps: [KeycloakService],
    },
  ],
};
```

- [ ] **Step 2.2 — Verify the app compiles**

```bash
cd frontend && npx ng build --configuration=development 2>&1 | tail -5
```

Expected: `Build at:` line with no errors.

- [ ] **Step 2.3 — Run all tests**

```bash
cd frontend && npx ng test --watch=false 2>&1 | grep -E "SUMMARY|FAILED|SUCCESS"
```

Expected: all specs pass, 0 failures.

- [ ] **Step 2.4 — Commit**

```bash
git add frontend/src/app/app.config.ts
git commit -m "feat(i18n): configure provideTransloco in app.config"
```

---

## Task 3: Translate nav layout (nav-items + AppLayout + Sidebar)

**Goal:** Change `NavItem.label` from display strings to translation keys. Add `TranslocoPipe` to `AppLayoutComponent` (tab bar) and `SidebarComponent` so both auto-translate.

**Files:**
- Modify: `frontend/src/app/core/layout/nav-items.ts`
- Modify: `frontend/src/app/core/layout/app-layout.component.ts`
- Modify: `frontend/src/app/shared/components/sidebar/sidebar.component.ts`

---

- [ ] **Step 3.1 — Update nav-items.ts to use translation keys**

Replace the full contents of `frontend/src/app/core/layout/nav-items.ts`:

```ts
import { SidebarItem } from '../../shared';

export interface NavItem extends SidebarItem {
  tab: string;
  iconActive: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'nav.home',
    tab: 'home',
    route: '/tabs/home',
    icon: 'home-outline',
    iconActive: 'home',
  },
  {
    label: 'nav.items',
    tab: 'example',
    route: '/tabs/example',
    icon: 'list-outline',
    iconActive: 'list',
  },
  {
    label: 'nav.profile',
    tab: 'profile',
    route: '/tabs/profile',
    icon: 'person-outline',
    iconActive: 'person',
  },
  {
    label: 'nav.settings',
    tab: 'settings',
    route: '/tabs/settings',
    icon: 'settings-outline',
    iconActive: 'settings',
  },
];
```

- [ ] **Step 3.2 — Add TranslocoPipe to AppLayoutComponent**

Replace the full contents of `frontend/src/app/core/layout/app-layout.component.ts`:

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
  settingsOutline, settings,
} from 'ionicons/icons';
import { TranslocoPipe } from '@jsverse/transloco';
import { BreakpointService } from '../breakpoint.service';
import { SidebarComponent, SidebarItem } from '../../shared';
import { NAV_ITEMS } from './nav-items';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonRouterOutlet,
    SidebarComponent, TranslocoPipe,
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
                  <ion-icon [name]="currentUrl().startsWith(item.route ?? '') ? item.iconActive : item.icon" />
                  <ion-label>{{ item.label | transloco }}</ion-label>
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
  private readonly router = inject(Router);

  readonly sidebarCollapsed = signal(false);
  readonly currentUrl = signal('');
  readonly navItems = NAV_ITEMS;

  constructor() {
    addIcons({ homeOutline, home, listOutline, list, personOutline, person, settingsOutline, settings });
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
    ).subscribe((e) => this.currentUrl.set(e.urlAfterRedirects));
    this.currentUrl.set(this.router.url);
  }

  navigate(item: SidebarItem): void {
    if (item.route) {
      this.router.navigateByUrl(item.route);
    }
  }
}
```

- [ ] **Step 3.3 — Add TranslocoPipe to SidebarComponent**

Read `frontend/src/app/shared/components/sidebar/sidebar.component.ts` and make two changes:

1. Add `TranslocoPipe` to the import statement at the top:
```ts
import { TranslocoPipe } from '@jsverse/transloco';
```

2. Add `TranslocoPipe` to the `@Component` imports array (alongside `IonIcon`):
```ts
imports: [IonIcon, TranslocoPipe],
```

3. Change the sidebar label binding from `{{ item.label }}` to `{{ item.label | transloco }}`:
```html
<span class="sidebar__label">{{ item.label | transloco }}</span>
```

The child label also needs updating — find the child item label:
```html
<span class="sidebar__label">{{ child.label | transloco }}</span>
```

- [ ] **Step 3.4 — Verify the app compiles**

```bash
cd frontend && npx ng build --configuration=development 2>&1 | tail -5
```

Expected: `Build at:` line with no errors.

- [ ] **Step 3.5 — Run all tests**

```bash
cd frontend && npx ng test --watch=false 2>&1 | grep -E "SUMMARY|FAILED|SUCCESS"
```

Expected: all specs pass, 0 failures.

- [ ] **Step 3.6 — Commit**

```bash
git add frontend/src/app/core/layout/nav-items.ts \
        frontend/src/app/core/layout/app-layout.component.ts \
        frontend/src/app/shared/components/sidebar/sidebar.component.ts
git commit -m "feat(i18n): translate nav items in sidebar and tab bar"
```

---

## Task 4: Translate Settings page + add language switcher

**Goal:** Replace hard-coded strings in `SettingsPage` with transloco pipe bindings, and add a Language section with a segment control that switches the active locale.

**Files:**
- Modify: `frontend/src/app/features/settings/settings.page.ts`

---

- [ ] **Step 4.1 — Replace settings.page.ts**

Replace the full contents of `frontend/src/app/features/settings/settings.page.ts`:

```ts
import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import {
  IonContent, IonList, IonItem, IonLabel,
  IonSegment, IonSegmentButton, IonRippleEffect,
} from '@ionic/angular/standalone';
import { Store } from '@ngrx/store';
import { TranslocoPipe } from '@jsverse/transloco';

import { ThemeService, ColorScheme, Accent } from '../../core/theme/theme.service';
import { I18nService } from '../../core/i18n/i18n.service';
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
    AsyncPipe, TranslocoPipe,
    IonContent, IonList, IonItem, IonLabel,
    IonSegment, IonSegmentButton, IonRippleEffect,
    PageHeaderComponent, SectionComponent,
  ],
  styleUrl: './settings.page.scss',
  template: `
    <app-page-header [title]="'settings.title' | transloco" [userName]="(fullName$ | async) ?? ''" />

    <ion-content class="settings-content">

      <app-section [title]="'settings.section.appearance' | transloco">
        <ion-list lines="none" class="settings-list">

          <ion-item class="settings-item">
            <ion-label>{{ 'settings.colorScheme' | transloco }}</ion-label>
            <ion-segment
              class="settings-segment"
              [value]="theme.scheme()"
              (ionChange)="onSchemeChange($event)"
            >
              <ion-segment-button value="light">{{ 'settings.colorScheme.light' | transloco }}</ion-segment-button>
              <ion-segment-button value="system">{{ 'settings.colorScheme.auto' | transloco }}</ion-segment-button>
              <ion-segment-button value="dark">{{ 'settings.colorScheme.dark' | transloco }}</ion-segment-button>
            </ion-segment>
          </ion-item>

          <ion-item class="settings-item">
            <ion-label>{{ 'settings.accentColor' | transloco }}</ion-label>
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

      <app-section [title]="'settings.section.language' | transloco">
        <ion-list lines="none" class="settings-list">
          <ion-item class="settings-item">
            <ion-label>{{ 'settings.language' | transloco }}</ion-label>
            <ion-segment
              class="settings-segment"
              [value]="i18n.activeLang()"
              (ionChange)="onLangChange($event)"
            >
              @for (lang of i18n.availableLangs; track lang.code) {
                <ion-segment-button [value]="lang.code">{{ lang.label }}</ion-segment-button>
              }
            </ion-segment>
          </ion-item>
        </ion-list>
      </app-section>

    </ion-content>
  `,
})
export class SettingsPage {
  readonly theme = inject(ThemeService);
  readonly i18n = inject(I18nService);
  readonly accentOptions = ACCENT_OPTIONS;
  readonly fullName$ = inject(Store).select(selectUserFullName);

  onSchemeChange(event: CustomEvent): void {
    this.theme.setScheme(event.detail.value as ColorScheme);
  }

  onAccentChange(accent: Accent): void {
    this.theme.setAccent(accent);
  }

  onLangChange(event: CustomEvent): void {
    this.i18n.setLang(event.detail.value as string);
  }
}
```

- [ ] **Step 4.2 — Verify the app compiles**

```bash
cd frontend && npx ng build --configuration=development 2>&1 | tail -5
```

Expected: `Build at:` line with no errors.

- [ ] **Step 4.3 — Run all tests**

```bash
cd frontend && npx ng test --watch=false 2>&1 | grep -E "SUMMARY|FAILED|SUCCESS"
```

Expected: all specs pass, 0 failures.

- [ ] **Step 4.4 — Commit**

```bash
git add frontend/src/app/features/settings/settings.page.ts
git commit -m "feat(i18n): translate Settings page and add language switcher"
```

---

## Task 5: Translate Home page

**Goal:** Replace all hard-coded strings in `HomePage` with transloco pipe bindings.

**Files:**
- Modify: `frontend/src/app/features/home/home.page.ts`

---

- [ ] **Step 5.1 — Replace home.page.ts**

Replace the full contents of `frontend/src/app/features/home/home.page.ts`:

```ts
import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { Store } from '@ngrx/store';
import { TranslocoPipe } from '@jsverse/transloco';

import { selectUserFullName, selectUserProfile } from '../../store/auth/auth.selectors';
import { PageHeaderComponent, SectionComponent, CardComponent } from '../../shared';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [AsyncPipe, RouterLink, IonContent, TranslocoPipe, PageHeaderComponent, SectionComponent, CardComponent],
  styleUrl: './home.page.scss',
  template: `
    <app-page-header [title]="'home.title' | transloco" [userName]="(fullName$ | async) ?? ''" />

    <ion-content class="home-content">

      <div class="home-greeting">
        <p class="home-greeting__label">{{ 'home.greeting' | transloco }}</p>
        <h1 class="home-greeting__name">{{ (profile$ | async)?.firstName || ('home.greeting.fallback' | transloco) }}</h1>
      </div>

      <app-section [title]="'home.section.quickActions' | transloco">
        <div class="home-cards">
          <app-card class="home-card" [clickable]="true" routerLink="/tabs/example">
            <div class="home-card__body">
              <p class="home-card__label">{{ 'home.card.browse' | transloco }}</p>
              <p class="home-card__sub">{{ 'home.card.browseDesc' | transloco }}</p>
            </div>
          </app-card>
          <app-card class="home-card" [clickable]="true" routerLink="/tabs/settings">
            <div class="home-card__body">
              <p class="home-card__label">{{ 'home.card.settings' | transloco }}</p>
              <p class="home-card__sub">{{ 'home.card.settingsDesc' | transloco }}</p>
            </div>
          </app-card>
        </div>
      </app-section>

    </ion-content>
  `,
})
export class HomePage {
  private readonly store = inject(Store);
  readonly fullName$ = this.store.select(selectUserFullName);
  readonly profile$ = this.store.select(selectUserProfile);
}
```

- [ ] **Step 5.2 — Verify the app compiles**

```bash
cd frontend && npx ng build --configuration=development 2>&1 | tail -5
```

Expected: `Build at:` line with no errors.

- [ ] **Step 5.3 — Commit**

```bash
git add frontend/src/app/features/home/home.page.ts
git commit -m "feat(i18n): translate Home page"
```

---

## Task 6: Translate Profile page

**Goal:** Replace all hard-coded strings in `ProfilePage` with transloco pipe bindings.

**Files:**
- Modify: `frontend/src/app/features/profile/profile.page.ts`

---

- [ ] **Step 6.1 — Replace profile.page.ts**

Replace the full contents of `frontend/src/app/features/profile/profile.page.ts`:

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
import { combineLatest } from 'rxjs';
import { TranslocoPipe } from '@jsverse/transloco';

import { AuthService } from '../../core/auth/auth.service';
import { selectUserFullName, selectUserProfile } from '../../store/auth/auth.selectors';
import {
  PageHeaderComponent, SectionComponent, AvatarComponent, DividerComponent,
} from '../../shared';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    AsyncPipe, TranslocoPipe,
    IonContent, IonList, IonItem, IonLabel, IonIcon,
    PageHeaderComponent, SectionComponent, AvatarComponent, DividerComponent,
  ],
  styleUrl: './profile.page.scss',
  template: `
    <app-page-header [title]="'profile.title' | transloco" [userName]="(vm$ | async)?.fullName ?? ''" [showAvatar]="false" />

    <ion-content class="profile-content">
      @if (vm$ | async; as vm) {
        <div class="profile-hero">
          <app-avatar [name]="vm.fullName" size="xl" class="profile-hero__avatar" />
          <h1 class="profile-hero__name">{{ vm.fullName || '—' }}</h1>
          <p class="profile-hero__email">{{ vm.profile?.email || '—' }}</p>
        </div>

        <app-divider />

        <app-section [title]="'profile.section.details' | transloco">
          <ion-list lines="none" class="profile-list">

            <ion-item class="profile-item">
              <ion-icon slot="start" name="person-outline" class="profile-item__icon" />
              <ion-label>
                <p class="profile-item__label">{{ 'profile.field.firstName' | transloco }}</p>
                <p class="profile-item__value">{{ vm.profile?.firstName || '—' }}</p>
              </ion-label>
            </ion-item>

            <ion-item class="profile-item">
              <ion-icon slot="start" name="person-outline" class="profile-item__icon" />
              <ion-label>
                <p class="profile-item__label">{{ 'profile.field.lastName' | transloco }}</p>
                <p class="profile-item__value">{{ vm.profile?.lastName || '—' }}</p>
              </ion-label>
            </ion-item>

            <ion-item class="profile-item">
              <ion-icon slot="start" name="mail-outline" class="profile-item__icon" />
              <ion-label>
                <p class="profile-item__label">{{ 'profile.field.email' | transloco }}</p>
                <p class="profile-item__value">{{ vm.profile?.email || '—' }}</p>
              </ion-label>
            </ion-item>

            <ion-item class="profile-item">
              <ion-icon slot="start" name="id-card-outline" class="profile-item__icon" />
              <ion-label>
                <p class="profile-item__label">{{ 'profile.field.username' | transloco }}</p>
                <p class="profile-item__value">{{ vm.profile?.username || '—' }}</p>
              </ion-label>
            </ion-item>

            <ion-item class="profile-item">
              <ion-icon slot="start" name="shield-checkmark-outline" class="profile-item__icon" />
              <ion-label>
                <p class="profile-item__label">{{ 'profile.field.emailVerified' | transloco }}</p>
                <p class="profile-item__value">
                  {{ vm.profile?.emailVerified ? ('profile.emailVerified.yes' | transloco) : ('profile.emailVerified.no' | transloco) }}
                </p>
              </ion-label>
            </ion-item>

          </ion-list>
        </app-section>

        <app-divider />

        <app-section [title]="'profile.section.session' | transloco">
          <ion-list lines="none" class="profile-list">
            <ion-item
              class="profile-item profile-item--danger"
              button
              detail="false"
              (click)="logout()"
            >
              <ion-icon slot="start" name="log-out-outline" class="profile-item__icon" />
              <ion-label>{{ 'profile.signOut' | transloco }}</ion-label>
            </ion-item>
          </ion-list>
        </app-section>
      }
    </ion-content>
  `,
})
export class ProfilePage {
  private readonly store = inject(Store);
  private readonly auth = inject(AuthService);

  readonly vm$ = combineLatest({
    fullName: this.store.select(selectUserFullName),
    profile: this.store.select(selectUserProfile),
  });

  constructor() {
    addIcons({ personOutline, mailOutline, idCardOutline, logOutOutline, shieldCheckmarkOutline });
  }

  logout(): void {
    this.auth.logout();
  }
}
```

- [ ] **Step 6.2 — Verify the app compiles**

```bash
cd frontend && npx ng build --configuration=development 2>&1 | tail -5
```

Expected: `Build at:` line with no errors.

- [ ] **Step 6.3 — Commit**

```bash
git add frontend/src/app/features/profile/profile.page.ts
git commit -m "feat(i18n): translate Profile page"
```

---

## Task 7: Translate Items pages

**Goal:** Replace hard-coded strings in `ExampleListPage` and `ExampleDetailPage` with transloco pipe bindings.

**Files:**
- Modify: `frontend/src/app/features/example/pages/example-list/example-list.page.ts`
- Modify: `frontend/src/app/features/example/pages/example-detail/example-detail.page.ts`

---

- [ ] **Step 7.1 — Update example-list.page.ts**

Replace the full contents of `frontend/src/app/features/example/pages/example-list/example-list.page.ts`:

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
import { TranslocoPipe } from '@jsverse/transloco';

import { ExampleActions } from '../../store/example.actions';
import { selectAllItems, selectLoading } from '../../store/example.selectors';
import { selectUserFullName } from '../../../../store/auth/auth.selectors';
import { PageHeaderComponent } from '../../../../shared';

@Component({
  selector: 'app-example-list',
  standalone: true,
  imports: [
    AsyncPipe, RouterLink, TranslocoPipe,
    IonContent,
    IonList, IonItem, IonLabel,
    IonFab, IonFabButton, IonIcon, IonSpinner,
    PageHeaderComponent,
  ],
  template: `
    <app-page-header [title]="'items.title' | transloco" [userName]="(fullName$ | async) ?? ''" />

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
  private readonly store = inject(Store);

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

- [ ] **Step 7.2 — Update example-detail.page.ts**

Replace the full contents of `frontend/src/app/features/example/pages/example-detail/example-detail.page.ts`:

```ts
import { Component, OnInit, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { IonContent, IonButton } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';

import { ExampleActions } from '../../store/example.actions';
import { selectSelectedItem } from '../../store/example.selectors';
import { PageHeaderComponent } from '../../../../shared';

@Component({
  selector: 'app-example-detail',
  standalone: true,
  imports: [AsyncPipe, IonContent, IonButton, PageHeaderComponent],
  template: `
    <app-page-header
      [title]="(item$ | async)?.title || transloco.translate('items.detail.title')"
      [showBack]="true"
      backHref="/tabs/example"
      [showAvatar]="false"
    >
      <ion-button slot="end" color="danger" (click)="delete()">
        {{ transloco.translate('common.delete') }}
      </ion-button>
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
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  readonly transloco = inject(TranslocoService);

  private itemId = '';

  readonly item$ = this.store.select(selectSelectedItem);

  ngOnInit(): void {
    this.itemId = this.route.snapshot.paramMap.get('id') ?? '';
    this.store.dispatch(ExampleActions.selectItem({ id: this.itemId }));
  }

  delete(): void {
    this.store.dispatch(ExampleActions.deleteItem({ id: this.itemId }));
  }
}
```

Note: `ExampleDetailPage` uses `TranslocoService.translate()` directly (imperative API) rather than the pipe because the fallback string in `[title]` is a bound attribute expression, not an interpolation — the pipe cannot be used there. `transloco.translate()` returns the translation synchronously once translations are loaded (guaranteed by `I18nService` preloading in constructor).

- [ ] **Step 7.3 — Verify the app compiles**

```bash
cd frontend && npx ng build --configuration=development 2>&1 | tail -5
```

Expected: `Build at:` line with no errors.

- [ ] **Step 7.4 — Run all tests**

```bash
cd frontend && npx ng test --watch=false 2>&1 | grep -E "SUMMARY|FAILED|SUCCESS"
```

Expected: all specs pass, 0 failures.

- [ ] **Step 7.5 — Commit**

```bash
git add frontend/src/app/features/example/pages/example-list/example-list.page.ts \
        frontend/src/app/features/example/pages/example-detail/example-detail.page.ts
git commit -m "feat(i18n): translate Items pages"
```

---

## Self-Review

**Spec coverage:**

| Requirement | Task |
|---|---|
| Install and configure Transloco | Tasks 1–2 |
| English translation file | Task 1 |
| Spanish translation file | Task 1 |
| I18nService with localStorage persistence | Task 1 |
| Language switcher in Settings | Task 4 |
| Nav items translated (sidebar + tab bar) | Task 3 |
| Home page translated | Task 5 |
| Profile page translated | Task 6 |
| Items list page translated | Task 7 |
| Items detail page translated | Task 7 |

**Placeholder scan:** No TBDs, no "similar to task N", no "add error handling" without code.

**Type consistency:**
- `I18nService.activeLang()` is a `Signal<string>` — used as `i18n.activeLang()` in the Settings template, consistent with Angular signals API.
- `I18nService.availableLangs` is `LangOption[]` — iterated with `@for (lang of i18n.availableLangs; track lang.code)` in Settings template.
- `I18nService.setLang(code: string)` — called from `onLangChange` in Settings, consistent signature.
- `NavItem.label` changed from display string to translation key — all consumers (AppLayout tab bar `item.label | transloco`, SidebarComponent `item.label | transloco`) updated in Task 3.
- Translation keys used in templates exactly match keys defined in `en.json` and `es.json`.

**Key decisions documented:**
- `ExampleDetailPage` uses `TranslocoService.translate()` (imperative) instead of the pipe for the `[title]` fallback expression — the pipe cannot be composed inside a ternary in a bound attribute. This works reliably because `I18nService` constructor preloads both translation files synchronously at app boot.
- `brand="PWA Template"` in `AppLayoutComponent` is intentionally NOT translated — brand names are language-neutral in this template.
- Accent color labels (`Blue`, `Clay`, etc.) are intentionally NOT translated — they reference specific color names that remain consistent across locales in design systems.
