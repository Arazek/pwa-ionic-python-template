# Items Section Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix six UX gaps in the Items CRUD section: empty state, create-via-form, edit flow, detail layout, post-action navigation, and user feedback.

**Architecture:** Add a reusable `ItemFormComponent` (bottom sheet modal) for both create and edit. Extend `ExampleEffects` with navigation and toast side-effects. Add a `selectIsEmpty` selector. Polish the list and detail pages using existing shared components.

**Tech Stack:** Angular 19 standalone, NgRx 19 effects, Ionic 8 modals, Reactive Forms, `BottomSheetService`, `ToastService`, `ConfirmDialogService`, Karma + Jasmine.

---

## File Map

| Status | File | Change |
|--------|------|--------|
| **Modify** | `frontend/src/app/features/example/store/example.selectors.ts` | Add `selectIsEmpty` |
| **Create** | `frontend/src/app/features/example/store/example.selectors.spec.ts` | Tests for `selectIsEmpty` |
| **Modify** | `frontend/src/app/features/example/store/example.effects.ts` | Navigate + toast effects; switch to `inject()`; remove debug logs |
| **Create** | `frontend/src/app/features/example/store/example.effects.spec.ts` | Tests for `navigateAfterCreate$` and `navigateAfterDelete$` |
| **Create** | `frontend/src/app/features/example/components/item-form/item-form.component.ts` | Bottom sheet form component |
| **Create** | `frontend/src/app/features/example/components/item-form/item-form.component.scss` | Form footer styles |
| **Modify** | `frontend/src/app/features/example/pages/example-list/example-list.page.ts` | Empty state, skeleton, create sheet |
| **Modify** | `frontend/src/app/features/example/pages/example-detail/example-detail.page.ts` | Edit sheet, confirm delete, layout polish |
| **Create** | `frontend/src/app/features/example/pages/example-detail/example-detail.page.scss` | Detail layout styles |

---

## Task 1: `selectIsEmpty` selector + list empty state + timestamps

**Goal:** Replace the black screen shown when the list is empty with `EmptyStateComponent`, and add a relative timestamp below each item's description.

**Files:**
- Modify: `frontend/src/app/features/example/store/example.selectors.ts`
- Create: `frontend/src/app/features/example/store/example.selectors.spec.ts`
- Modify: `frontend/src/app/features/example/pages/example-list/example-list.page.ts`

---

- [ ] **Step 1.1 — Write the failing selector test**

Create `frontend/src/app/features/example/store/example.selectors.spec.ts`:

```ts
import { selectIsEmpty } from './example.selectors';

const item = {
  id: '1', title: 'Test', description: null,
  owner_id: 'u1', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z',
};

describe('selectIsEmpty', () => {
  it('returns true when items array is empty and loading is false', () => {
    expect(selectIsEmpty.projector([], false)).toBeTrue();
  });

  it('returns false when items array has entries', () => {
    expect(selectIsEmpty.projector([item], false)).toBeFalse();
  });

  it('returns false while loading even if items is empty', () => {
    expect(selectIsEmpty.projector([], true)).toBeFalse();
  });
});
```

- [ ] **Step 1.2 — Run the test to confirm it fails**

```bash
cd frontend && npx ng test --watch=false --include="**/example.selectors.spec.ts" 2>&1 | grep -E "SUMMARY|FAILED|ERROR|selectIsEmpty"
```

Expected: compile error — `selectIsEmpty` is not exported from `./example.selectors`.

- [ ] **Step 1.3 — Add `selectIsEmpty` to `example.selectors.ts`**

Replace the contents of `frontend/src/app/features/example/store/example.selectors.ts` with:

```ts
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ExampleState } from './example.state';

export const selectExampleState = createFeatureSelector<ExampleState>('example');

export const selectAllItems = createSelector(
  selectExampleState,
  (state) => state.items,
);

export const selectLoading = createSelector(
  selectExampleState,
  (state) => state.loading,
);

export const selectError = createSelector(
  selectExampleState,
  (state) => state.error,
);

export const selectSelectedId = createSelector(
  selectExampleState,
  (state) => state.selectedId,
);

export const selectSelectedItem = createSelector(
  selectAllItems,
  selectSelectedId,
  (items, id) => items.find((i) => i.id === id) ?? null,
);

export const selectIsEmpty = createSelector(
  selectAllItems,
  selectLoading,
  (items, loading) => !loading && items.length === 0,
);
```

- [ ] **Step 1.4 — Run the selector test to confirm it passes**

```bash
cd frontend && npx ng test --watch=false --include="**/example.selectors.spec.ts" 2>&1 | grep -E "SUMMARY|FAILED|SUCCESS|spec"
```

Expected: 3 specs, 0 failures.

- [ ] **Step 1.5 — Replace `example-list.page.ts` with empty state + timestamps**

Replace the contents of `frontend/src/app/features/example/pages/example-list/example-list.page.ts` with:

```ts
import { Component, OnInit, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import {
  IonContent, IonList, IonItem, IonLabel,
  IonFab, IonFabButton, IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add } from 'ionicons/icons';

import { ExampleActions } from '../../store/example.actions';
import { selectAllItems, selectLoading, selectIsEmpty } from '../../store/example.selectors';
import { selectUserFullName } from '../../../../store/auth/auth.selectors';
import { PageHeaderComponent, EmptyStateComponent, TimeAgoPipe } from '../../../../shared';

@Component({
  selector: 'app-example-list',
  standalone: true,
  imports: [
    AsyncPipe, RouterLink,
    IonContent, IonList, IonItem, IonLabel,
    IonFab, IonFabButton, IonIcon,
    PageHeaderComponent, EmptyStateComponent, TimeAgoPipe,
  ],
  template: `
    <app-page-header title="Items" [userName]="(fullName$ | async) ?? ''" />

    <ion-content>
      @if (isEmpty$ | async) {
        <app-empty-state
          icon="document-outline"
          title="No items yet"
          message="Tap + to create your first item"
          actionLabel="Create item"
          (action)="createItem()"
        />
      }

      <ion-list>
        @for (item of items$ | async; track item.id) {
          <ion-item [routerLink]="[item.id]" button detail>
            <ion-label>
              <h2>{{ item.title }}</h2>
              <p>{{ item.description }}</p>
              <p class="item-meta">{{ item.created_at | timeAgo }}</p>
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
  readonly isEmpty$ = this.store.select(selectIsEmpty);
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

Note: `createItem()` still uses hardcoded values for now — Task 4 replaces it with the bottom sheet. This keeps each task independently testable.

- [ ] **Step 1.6 — Verify the app compiles**

```bash
cd frontend && npx ng build --configuration=development 2>&1 | tail -5
```

Expected: `Build at:` line with no errors.

- [ ] **Step 1.7 — Commit**

```bash
git add frontend/src/app/features/example/store/example.selectors.ts \
        frontend/src/app/features/example/store/example.selectors.spec.ts \
        frontend/src/app/features/example/pages/example-list/example-list.page.ts
git commit -m "feat(items): add selectIsEmpty selector, empty state, and timestamps on list rows"
```

---

## Task 2: Loading skeleton

**Goal:** Replace the raw `<ion-spinner>` with `LoadingSkeletonComponent` so the loading state looks polished.

**Files:**
- Modify: `frontend/src/app/features/example/pages/example-list/example-list.page.ts`

---

- [ ] **Step 2.1 — Replace list page template with skeleton**

Replace the contents of `frontend/src/app/features/example/pages/example-list/example-list.page.ts` with:

```ts
import { Component, OnInit, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import {
  IonContent, IonList, IonItem, IonLabel,
  IonFab, IonFabButton, IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add } from 'ionicons/icons';

import { ExampleActions } from '../../store/example.actions';
import { selectAllItems, selectLoading, selectIsEmpty } from '../../store/example.selectors';
import { selectUserFullName } from '../../../../store/auth/auth.selectors';
import {
  PageHeaderComponent, EmptyStateComponent,
  LoadingSkeletonComponent, TimeAgoPipe,
} from '../../../../shared';

@Component({
  selector: 'app-example-list',
  standalone: true,
  imports: [
    AsyncPipe, RouterLink,
    IonContent, IonList, IonItem, IonLabel,
    IonFab, IonFabButton, IonIcon,
    PageHeaderComponent, EmptyStateComponent, LoadingSkeletonComponent, TimeAgoPipe,
  ],
  template: `
    <app-page-header title="Items" [userName]="(fullName$ | async) ?? ''" />

    <ion-content>
      @if (loading$ | async) {
        <app-loading-skeleton [count]="3" [showAvatar]="false" />
      } @else if (isEmpty$ | async) {
        <app-empty-state
          icon="document-outline"
          title="No items yet"
          message="Tap + to create your first item"
          actionLabel="Create item"
          (action)="createItem()"
        />
      } @else {
        <ion-list>
          @for (item of items$ | async; track item.id) {
            <ion-item [routerLink]="[item.id]" button detail>
              <ion-label>
                <h2>{{ item.title }}</h2>
                <p>{{ item.description }}</p>
                <p class="item-meta">{{ item.created_at | timeAgo }}</p>
              </ion-label>
            </ion-item>
          }
        </ion-list>
      }

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
  readonly isEmpty$ = this.store.select(selectIsEmpty);
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

- [ ] **Step 2.2 — Verify the app compiles**

```bash
cd frontend && npx ng build --configuration=development 2>&1 | tail -5
```

Expected: `Build at:` line with no errors.

- [ ] **Step 2.3 — Commit**

```bash
git add frontend/src/app/features/example/pages/example-list/example-list.page.ts
git commit -m "feat(items): replace spinner with LoadingSkeletonComponent on list page"
```

---

## Task 3: `ItemFormComponent` — bottom sheet form

**Goal:** Create a standalone modal component for creating and editing items, opened via `BottomSheetService`. The component dismisses with `{ title, description }` on save, or with no data on cancel.

**Files:**
- Create: `frontend/src/app/features/example/components/item-form/item-form.component.ts`
- Create: `frontend/src/app/features/example/components/item-form/item-form.component.scss`

---

- [ ] **Step 3.1 — Create `item-form.component.scss`**

Create `frontend/src/app/features/example/components/item-form/item-form.component.scss`:

```scss
.item-form__footer {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
```

- [ ] **Step 3.2 — Create `item-form.component.ts`**

Create `frontend/src/app/features/example/components/item-form/item-form.component.ts`:

```ts
import { Component, Input, OnInit, inject } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonFooter, IonButton,
} from '@ionic/angular/standalone';
import { BottomSheetService, FormFieldComponent, TextareaFieldComponent } from '../../../../shared';

@Component({
  selector: 'app-item-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonFooter, IonButton,
    FormFieldComponent, TextareaFieldComponent,
  ],
  styleUrl: './item-form.component.scss',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ initialTitle ? 'Edit item' : 'New item' }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <form [formGroup]="form" (ngSubmit)="submit()">
        <app-form-field
          label="Title"
          placeholder="Item title"
          [required]="true"
          [control]="titleControl"
        />
        <app-textarea-field
          label="Description"
          placeholder="Optional description"
          [rows]="3"
          [control]="descControl"
        />
      </form>
    </ion-content>
    <ion-footer class="ion-padding item-form__footer">
      <ion-button expand="block" [disabled]="form.invalid" (click)="submit()">Save</ion-button>
      <ion-button expand="block" fill="clear" (click)="cancel()">Cancel</ion-button>
    </ion-footer>
  `,
})
export class ItemFormComponent implements OnInit {
  @Input() initialTitle = '';
  @Input() initialDescription = '';

  private readonly sheet = inject(BottomSheetService);

  readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    desc: new FormControl('', { nonNullable: true }),
  });

  get titleControl(): FormControl { return this.form.controls.title; }
  get descControl(): FormControl { return this.form.controls.desc; }

  ngOnInit(): void {
    this.form.setValue({ title: this.initialTitle, desc: this.initialDescription ?? '' });
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const { title, desc } = this.form.getRawValue();
    this.sheet.dismiss({ title: title.trim(), description: desc.trim() || null });
  }

  cancel(): void {
    this.sheet.dismiss();
  }
}
```

- [ ] **Step 3.3 — Verify the app compiles**

```bash
cd frontend && npx ng build --configuration=development 2>&1 | tail -5
```

Expected: `Build at:` line with no errors.

- [ ] **Step 3.4 — Commit**

```bash
git add frontend/src/app/features/example/components/item-form/item-form.component.ts \
        frontend/src/app/features/example/components/item-form/item-form.component.scss
git commit -m "feat(items): add ItemFormComponent bottom sheet for create and edit"
```

---

## Task 4: Create flow — bottom sheet + navigate to new item + toast

**Goal:** Replace the hardcoded `createItem()` dispatch with a bottom sheet form. After a successful create, navigate to the new item's detail page and show a success toast. Show an error toast on failure.

**Files:**
- Modify: `frontend/src/app/features/example/pages/example-list/example-list.page.ts`
- Modify: `frontend/src/app/features/example/store/example.effects.ts`
- Create: `frontend/src/app/features/example/store/example.effects.spec.ts`

---

- [ ] **Step 4.1 — Write the failing effects tests**

Create `frontend/src/app/features/example/store/example.effects.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable, of } from 'rxjs';
import { Router } from '@angular/router';
import { Action } from '@ngrx/store';

import { ExampleEffects } from './example.effects';
import { ExampleActions } from './example.actions';
import { ExampleApiService } from '../services/example-api.service';
import { ToastService } from '../../../shared';

const mockItem = {
  id: 'abc123', title: 'Test', description: null,
  owner_id: 'u1', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z',
};

describe('ExampleEffects', () => {
  let actions$: Observable<Action>;
  let effects: ExampleEffects;
  let router: jasmine.SpyObj<Router>;
  let toast: jasmine.SpyObj<ToastService>;

  beforeEach(() => {
    router = jasmine.createSpyObj('Router', ['navigateByUrl']);
    toast = jasmine.createSpyObj('ToastService', ['success', 'error']);
    router.navigateByUrl.and.returnValue(Promise.resolve(true));
    toast.success.and.returnValue(Promise.resolve());
    toast.error.and.returnValue(Promise.resolve());

    TestBed.configureTestingModule({
      providers: [
        ExampleEffects,
        provideMockActions(() => actions$),
        { provide: Router, useValue: router },
        { provide: ToastService, useValue: toast },
        {
          provide: ExampleApiService,
          useValue: jasmine.createSpyObj('ExampleApiService', ['getAll', 'create', 'update', 'delete']),
        },
      ],
    });

    effects = TestBed.inject(ExampleEffects);
  });

  describe('navigateAfterCreate$', () => {
    it('navigates to /tabs/example/:id after createItemSuccess', (done) => {
      actions$ = of(ExampleActions.createItemSuccess({ item: mockItem }));
      effects.navigateAfterCreate$.subscribe(() => {
        expect(router.navigateByUrl).toHaveBeenCalledWith('/tabs/example/abc123');
        done();
      });
    });
  });

  describe('navigateAfterDelete$', () => {
    it('navigates to /tabs/example after deleteItemSuccess', (done) => {
      actions$ = of(ExampleActions.deleteItemSuccess({ id: 'abc123' }));
      effects.navigateAfterDelete$.subscribe(() => {
        expect(router.navigateByUrl).toHaveBeenCalledWith('/tabs/example');
        done();
      });
    });
  });
});
```

- [ ] **Step 4.2 — Run the tests to confirm they fail**

```bash
cd frontend && npx ng test --watch=false --include="**/example.effects.spec.ts" 2>&1 | grep -E "SUMMARY|FAILED|ERROR|navigateAfter"
```

Expected: compilation error — `navigateAfterCreate$` does not exist on `ExampleEffects`.

- [ ] **Step 4.3 — Replace `example.effects.ts` with the full updated implementation**

Replace the full contents of `frontend/src/app/features/example/store/example.effects.ts`:

```ts
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, mergeMap, of, switchMap, tap } from 'rxjs';
import { ExampleActions } from './example.actions';
import { ExampleApiService } from '../services/example-api.service';
import { ToastService } from '../../../shared';

@Injectable()
export class ExampleEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(ExampleApiService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  loadItems$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ExampleActions.loadItems),
      switchMap(() =>
        this.api.getAll().pipe(
          map((items) => ExampleActions.loadItemsSuccess({ items })),
          catchError((error) =>
            of(ExampleActions.loadItemsFailure({ error: error.message })),
          ),
        ),
      ),
    ),
  );

  createItem$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ExampleActions.createItem),
      mergeMap(({ title, description }) =>
        this.api.create({ title, description }).pipe(
          map((item) => ExampleActions.createItemSuccess({ item })),
          catchError((error) =>
            of(ExampleActions.createItemFailure({ error: error.message })),
          ),
        ),
      ),
    ),
  );

  navigateAfterCreate$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ExampleActions.createItemSuccess),
      tap(({ item }) => this.router.navigateByUrl(`/tabs/example/${item.id}`)),
    ),
    { dispatch: false },
  );

  toastOnCreateSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ExampleActions.createItemSuccess),
      tap(() => this.toast.success('Item created')),
    ),
    { dispatch: false },
  );

  toastOnCreateError$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ExampleActions.createItemFailure),
      tap(() => this.toast.error('Failed to create item')),
    ),
    { dispatch: false },
  );

  updateItem$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ExampleActions.updateItem),
      mergeMap(({ id, title, description }) =>
        this.api.update(id, { title, description }).pipe(
          map((item) => ExampleActions.updateItemSuccess({ item })),
          catchError((error) =>
            of(ExampleActions.updateItemFailure({ error: error.message })),
          ),
        ),
      ),
    ),
  );

  toastOnUpdateSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ExampleActions.updateItemSuccess),
      tap(() => this.toast.success('Item updated')),
    ),
    { dispatch: false },
  );

  toastOnUpdateError$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ExampleActions.updateItemFailure),
      tap(() => this.toast.error('Failed to update item')),
    ),
    { dispatch: false },
  );

  deleteItem$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ExampleActions.deleteItem),
      mergeMap(({ id }) =>
        this.api.delete(id).pipe(
          map(() => ExampleActions.deleteItemSuccess({ id })),
          catchError((error) =>
            of(ExampleActions.deleteItemFailure({ error: error.message })),
          ),
        ),
      ),
    ),
  );

  navigateAfterDelete$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ExampleActions.deleteItemSuccess),
      tap(() => this.router.navigateByUrl('/tabs/example')),
    ),
    { dispatch: false },
  );

  toastOnDeleteSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ExampleActions.deleteItemSuccess),
      tap(() => this.toast.success('Item deleted')),
    ),
    { dispatch: false },
  );

  toastOnDeleteError$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ExampleActions.deleteItemFailure),
      tap(() => this.toast.error('Failed to delete item')),
    ),
    { dispatch: false },
  );
}
```

- [ ] **Step 4.4 — Run the effects tests to confirm they pass**

```bash
cd frontend && npx ng test --watch=false --include="**/example.effects.spec.ts" 2>&1 | grep -E "SUMMARY|FAILED|SUCCESS|spec"
```

Expected: 2 specs, 0 failures.

- [ ] **Step 4.5 — Wire the bottom sheet in `example-list.page.ts`**

Replace the full contents of `frontend/src/app/features/example/pages/example-list/example-list.page.ts`:

```ts
import { Component, OnInit, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import {
  IonContent, IonList, IonItem, IonLabel,
  IonFab, IonFabButton, IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add } from 'ionicons/icons';

import { ExampleActions } from '../../store/example.actions';
import { selectAllItems, selectLoading, selectIsEmpty } from '../../store/example.selectors';
import { selectUserFullName } from '../../../../store/auth/auth.selectors';
import {
  PageHeaderComponent, EmptyStateComponent,
  LoadingSkeletonComponent, TimeAgoPipe, BottomSheetService,
} from '../../../../shared';
import { ItemFormComponent } from '../../components/item-form/item-form.component';

@Component({
  selector: 'app-example-list',
  standalone: true,
  imports: [
    AsyncPipe, RouterLink,
    IonContent, IonList, IonItem, IonLabel,
    IonFab, IonFabButton, IonIcon,
    PageHeaderComponent, EmptyStateComponent, LoadingSkeletonComponent, TimeAgoPipe,
  ],
  template: `
    <app-page-header title="Items" [userName]="(fullName$ | async) ?? ''" />

    <ion-content>
      @if (loading$ | async) {
        <app-loading-skeleton [count]="3" [showAvatar]="false" />
      } @else if (isEmpty$ | async) {
        <app-empty-state
          icon="document-outline"
          title="No items yet"
          message="Tap + to create your first item"
          actionLabel="Create item"
          (action)="openCreateSheet()"
        />
      } @else {
        <ion-list>
          @for (item of items$ | async; track item.id) {
            <ion-item [routerLink]="[item.id]" button detail>
              <ion-label>
                <h2>{{ item.title }}</h2>
                <p>{{ item.description }}</p>
                <p class="item-meta">{{ item.created_at | timeAgo }}</p>
              </ion-label>
            </ion-item>
          }
        </ion-list>
      }

      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button (click)="openCreateSheet()">
          <ion-icon name="add" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  `,
})
export class ExampleListPage implements OnInit {
  private readonly store = inject(Store);
  private readonly sheet = inject(BottomSheetService);

  readonly items$ = this.store.select(selectAllItems);
  readonly loading$ = this.store.select(selectLoading);
  readonly isEmpty$ = this.store.select(selectIsEmpty);
  readonly fullName$ = this.store.select(selectUserFullName);

  constructor() { addIcons({ add }); }

  ngOnInit(): void {
    this.store.dispatch(ExampleActions.loadItems());
  }

  async openCreateSheet(): Promise<void> {
    const result = await this.sheet.open({
      component: ItemFormComponent,
      breakpoints: [0, 0.75, 1],
      initialBreakpoint: 0.75,
    });
    if (result && typeof result === 'object') {
      const { title, description } = result as { title: string; description: string | null };
      this.store.dispatch(ExampleActions.createItem({ title, description: description ?? undefined }));
    }
  }
}
```

- [ ] **Step 4.6 — Verify the app compiles**

```bash
cd frontend && npx ng build --configuration=development 2>&1 | tail -5
```

Expected: `Build at:` line with no errors.

- [ ] **Step 4.7 — Run all tests to confirm nothing regressed**

```bash
cd frontend && npx ng test --watch=false 2>&1 | grep -E "SUMMARY|FAILED|SUCCESS"
```

Expected: all specs pass, 0 failures.

- [ ] **Step 4.8 — Commit**

```bash
git add frontend/src/app/features/example/store/example.effects.ts \
        frontend/src/app/features/example/store/example.effects.spec.ts \
        frontend/src/app/features/example/pages/example-list/example-list.page.ts
git commit -m "feat(items): create via bottom sheet, navigate to new item, toast on create"
```

---

## Task 5: Edit flow in detail page + detail layout polish

**Goal:** Add an Edit button to the detail page that opens `ItemFormComponent` pre-filled with the current item values. Replace the bare `<h2>/<p>` layout with a structured `SectionComponent` showing title, description, created_at, and updated_at. Handle direct URL navigation by dispatching `loadItems` if the store is empty.

**Files:**
- Modify: `frontend/src/app/features/example/pages/example-detail/example-detail.page.ts`
- Create: `frontend/src/app/features/example/pages/example-detail/example-detail.page.scss`

---

- [ ] **Step 5.1 — Create `example-detail.page.scss`**

Create `frontend/src/app/features/example/pages/example-detail/example-detail.page.scss`:

```scss
.detail-content {
  --background: var(--ion-background-color);
}

.detail-list {
  --background: transparent;
  padding: 0 8px;
}

.detail-item {
  --background: transparent;
  --padding-start: 12px;
  --inner-padding-end: 12px;
}

.detail-item__label {
  font-size: 11px;
  color: var(--ion-color-medium);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 2px;
}

.detail-item__value {
  font-size: 15px;
  font-weight: 500;
  color: var(--ion-text-color);
}
```

- [ ] **Step 5.2 — Replace `example-detail.page.ts` with edit flow and structured layout**

Replace the full contents of `frontend/src/app/features/example/pages/example-detail/example-detail.page.ts`:

```ts
import { Component, OnInit, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { take } from 'rxjs';
import { IonContent, IonButton, IonList, IonItem, IonLabel } from '@ionic/angular/standalone';

import { ExampleActions } from '../../store/example.actions';
import { selectSelectedItem, selectAllItems } from '../../store/example.selectors';
import {
  PageHeaderComponent, SectionComponent, TimeAgoPipe,
  BottomSheetService, ConfirmDialogService,
} from '../../../../shared';
import { ItemFormComponent } from '../../components/item-form/item-form.component';

@Component({
  selector: 'app-example-detail',
  standalone: true,
  imports: [
    AsyncPipe,
    IonContent, IonButton, IonList, IonItem, IonLabel,
    PageHeaderComponent, SectionComponent, TimeAgoPipe,
  ],
  styleUrl: './example-detail.page.scss',
  template: `
    <app-page-header
      [title]="(item$ | async)?.title || 'Item'"
      [showBack]="true"
      backHref="/tabs/example"
      [showAvatar]="false"
    >
      <ion-button slot="end" fill="clear" (click)="openEditSheet()">Edit</ion-button>
      <ion-button slot="end" color="danger" fill="clear" (click)="confirmDelete()">Delete</ion-button>
    </app-page-header>

    <ion-content class="detail-content">
      @if (item$ | async; as item) {
        <app-section title="Details">
          <ion-list lines="none" class="detail-list">
            <ion-item class="detail-item">
              <ion-label>
                <p class="detail-item__label">Title</p>
                <p class="detail-item__value">{{ item.title }}</p>
              </ion-label>
            </ion-item>
            <ion-item class="detail-item">
              <ion-label>
                <p class="detail-item__label">Description</p>
                <p class="detail-item__value">{{ item.description || '—' }}</p>
              </ion-label>
            </ion-item>
            <ion-item class="detail-item">
              <ion-label>
                <p class="detail-item__label">Created</p>
                <p class="detail-item__value">{{ item.created_at | timeAgo }}</p>
              </ion-label>
            </ion-item>
            <ion-item class="detail-item">
              <ion-label>
                <p class="detail-item__label">Updated</p>
                <p class="detail-item__value">{{ item.updated_at | timeAgo }}</p>
              </ion-label>
            </ion-item>
          </ion-list>
        </app-section>
      }
    </ion-content>
  `,
})
export class ExampleDetailPage implements OnInit {
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  private readonly sheet = inject(BottomSheetService);
  private readonly confirm = inject(ConfirmDialogService);

  private itemId = '';

  readonly item$ = this.store.select(selectSelectedItem);

  ngOnInit(): void {
    this.itemId = this.route.snapshot.paramMap.get('id') ?? '';
    this.store.select(selectAllItems).pipe(take(1)).subscribe((items) => {
      if (items.length === 0) {
        this.store.dispatch(ExampleActions.loadItems());
      }
    });
    this.store.dispatch(ExampleActions.selectItem({ id: this.itemId }));
  }

  async openEditSheet(): Promise<void> {
    this.item$.pipe(take(1)).subscribe(async (item) => {
      if (!item) return;
      const result = await this.sheet.open({
        component: ItemFormComponent,
        componentProps: {
          initialTitle: item.title,
          initialDescription: item.description ?? '',
        },
        breakpoints: [0, 0.75, 1],
        initialBreakpoint: 0.75,
      });
      if (result && typeof result === 'object') {
        const { title, description } = result as { title: string; description: string | null };
        this.store.dispatch(ExampleActions.updateItem({
          id: this.itemId,
          title,
          description: description ?? undefined,
        }));
      }
    });
  }

  async confirmDelete(): Promise<void> {
    const confirmed = await this.confirm.confirm({
      title: 'Delete item',
      message: 'This action cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (confirmed) {
      this.store.dispatch(ExampleActions.deleteItem({ id: this.itemId }));
    }
  }
}
```

- [ ] **Step 5.3 — Verify the app compiles**

```bash
cd frontend && npx ng build --configuration=development 2>&1 | tail -5
```

Expected: `Build at:` line with no errors.

- [ ] **Step 5.4 — Run all tests**

```bash
cd frontend && npx ng test --watch=false 2>&1 | grep -E "SUMMARY|FAILED|SUCCESS"
```

Expected: all specs pass, 0 failures.

- [ ] **Step 5.5 — Commit**

```bash
git add frontend/src/app/features/example/pages/example-detail/example-detail.page.ts \
        frontend/src/app/features/example/pages/example-detail/example-detail.page.scss
git commit -m "feat(items): edit flow via bottom sheet, structured detail layout with timestamps"
```

---

## Task 6: Verify delete confirmation + post-delete flows

**Goal:** Confirm the delete confirmation dialog, navigate-after-delete effect, and toast are all wired and working. No new code — these were implemented in Tasks 4 and 5. This task validates the full end-to-end wiring.

**Files:** None (validation only)

---

- [ ] **Step 6.1 — Run the full test suite**

```bash
cd frontend && npx ng test --watch=false 2>&1 | grep -E "SUMMARY|FAILED|SUCCESS"
```

Expected: all specs pass, 0 failures.

- [ ] **Step 6.2 — Final build check**

```bash
cd frontend && npx ng build --configuration=development 2>&1 | tail -5
```

Expected: `Build at:` line with no errors.

---

## Self-review

**Spec coverage:**

| Requirement | Task |
|---|---|
| No empty state (black screen) | Task 1 — `selectIsEmpty` + `EmptyStateComponent` |
| Hardcoded create | Task 4 — `openCreateSheet()` via `ItemFormComponent` |
| No edit flow | Task 5 — `openEditSheet()` pre-fills `ItemFormComponent` |
| Sparse detail layout | Task 5 — `SectionComponent` with 4 labelled fields |
| No post-create navigation/feedback | Task 4 — `navigateAfterCreate$` + `toastOnCreateSuccess$` |
| No post-delete confirmation/feedback | Task 4 effects + Task 5 `confirmDelete()` |
| Timestamps on list rows | Task 1 — `TimeAgoPipe` on `created_at` |
| Loading skeleton | Task 2 — `LoadingSkeletonComponent` |

**Placeholder scan:** No TBDs, no "similar to task N" references, no "add appropriate error handling".

**Type consistency:**
- `ItemFormComponent.initialTitle` / `.initialDescription` defined in Task 3, used identically in Task 5.
- `openCreateSheet()` defined in Task 4 list page; `openEditSheet()` / `confirmDelete()` defined in Task 5 detail page.
- `navigateAfterCreate$` / `navigateAfterDelete$` defined in Task 4 effects, tested in Task 4 spec.
- All action creators match the `ExampleActions` group: `createItemSuccess`, `deleteItemSuccess`, `updateItemSuccess`, etc.
