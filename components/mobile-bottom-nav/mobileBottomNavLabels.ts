import type { MobileBottomNavItem } from './mobileBottomNavTypes';

export const getMobileBottomNavAriaLabel = (item: MobileBottomNavItem): string => {
  if (item.id === 'dashboard') return 'پیشخوان موبایل؛ تصمیم سریع روزانه';
  if (item.id === 'reports') return 'گزارش‌ها؛ منبع رسمی تحلیل';
  return 'ناوبری موبایل';
};

export const getMobileBottomNavTitle = (item: MobileBottomNavItem): string => {
  if (item.id === 'dashboard') return 'تصمیم سریع روزانه';
  if (item.id === 'reports') return 'منبع رسمی گزارش';
  return item.name;
};
