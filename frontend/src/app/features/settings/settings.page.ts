import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import {
  IonContent, IonList, IonItem, IonLabel,
  IonSegment, IonSegmentButton, IonRippleEffect,
} from '@ionic/angular/standalone';
import { Store } from '@ngrx/store';

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
    IonSegment, IonSegmentButton, IonRippleEffect,
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

  onSchemeChange(event: CustomEvent): void {
    this.theme.setScheme(event.detail.value as ColorScheme);
  }

  onAccentChange(accent: Accent): void {
    this.theme.setAccent(accent);
  }
}
