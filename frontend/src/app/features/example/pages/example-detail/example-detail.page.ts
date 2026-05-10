import { Component, OnInit, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { IonContent, IonButton } from '@ionic/angular/standalone';

import { ExampleActions } from '../../store/example.actions';
import { selectSelectedItem } from '../../store/example.selectors';
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
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);

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
