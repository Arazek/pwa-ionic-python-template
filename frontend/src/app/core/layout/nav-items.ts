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
