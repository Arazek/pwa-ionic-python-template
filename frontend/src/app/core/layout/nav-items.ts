import { SidebarItem } from '../../shared';

export interface NavItem extends SidebarItem {
  tab: string;
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
