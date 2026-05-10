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
                  <ion-icon [name]="currentUrl().startsWith(item.route ?? '') ? item.iconActive : item.icon" />
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
  private readonly router = inject(Router);

  readonly sidebarCollapsed = signal(false);
  readonly currentUrl = signal('');
  readonly navItems = NAV_ITEMS;

  constructor() {
    addIcons({
      homeOutline, home,
      listOutline, list,
      personOutline, person,
      settingsOutline, settings,
    });
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
