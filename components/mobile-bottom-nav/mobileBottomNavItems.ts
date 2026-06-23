import type { MobileBottomNavItem } from './mobileBottomNavTypes';

// Bottom bar is intentionally small (3 main destinations) + a central action + “more”.
// It stays consistent and app-like: floating, blurred, rounded, and safe-area aware.
export const BOTTOM_NAV_ITEMS: MobileBottomNavItem[] = [
  { id: 'dashboard', name: 'پیشخوان', icon: 'fa-solid fa-chart-line', path: '/' },
  { id: 'products', name: 'انبار', icon: 'fa-solid fa-boxes-stacked', path: '/products' },
  { id: 'reports', name: 'گزارش‌ها', icon: 'fa-solid fa-chart-pie', path: '/reports' },
];

export const QUICK_SALE_PATH = '/sales/cash';
