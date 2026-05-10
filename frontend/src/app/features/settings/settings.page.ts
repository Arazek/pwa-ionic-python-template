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
