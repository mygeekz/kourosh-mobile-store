import type { NavigationIconMetadata } from '../../types/iconMetadata';

export interface MobileBottomNavItem {
  id: string;
  name: string;
  icon: NavigationIconMetadata;
  path: string;
}

export interface MobileBottomNavProps {
  onMenuClick: () => void;
}
