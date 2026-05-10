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
