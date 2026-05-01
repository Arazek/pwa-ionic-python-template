import { Component, inject, signal } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import {
  IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonRouterOutlet,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { home, list, settingsOutline } from 'ionicons/icons';
import { BreakpointService } from '../breakpoint.service';
import { SidebarComponent, SidebarItem } from '../../shared';

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
              <ion-tab-button tab="home" href="/tabs/home">
                <ion-icon name="home" />
                <ion-label>Home</ion-label>
              </ion-tab-button>

              <ion-tab-button tab="example" href="/tabs/example">
                <ion-icon name="list" />
                <ion-label>Items</ion-label>
              </ion-tab-button>

              <ion-tab-button tab="settings" href="/tabs/settings">
                <ion-icon name="settings-outline" />
                <ion-label>Settings</ion-label>
              </ion-tab-button>
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

  constructor() {
    addIcons({ home, list, settingsOutline });
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
    ).subscribe(e => this.currentUrl.set(e.urlAfterRedirects));
    this.currentUrl.set(this.router.url);
  }

  readonly navItems: SidebarItem[] = [
    { label: 'Home', icon: 'home-outline', route: '/tabs/home' },
    { label: 'Items', icon: 'list-outline', route: '/tabs/example' },
    { label: 'Settings', icon: 'settings-outline', route: '/tabs/settings' },
  ];

  navigate(item: SidebarItem): void {
    if (item.route) {
      this.router.navigateByUrl(item.route);
    }
  }
}
