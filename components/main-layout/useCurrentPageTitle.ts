import { useMemo } from 'react';
import { SIDEBAR_ITEMS } from '../../constants';
import type { AuthUser, NavItem } from '../../types';

const findBestMatch = (pathname: string, items: NavItem[], depth = 0): { name: string; score: number } | null => {
  let best: { name: string; score: number } | null = null;

  for (const item of items) {
    if (item.path && item.path !== '/' && pathname.startsWith(item.path)) {
      const score = item.path.length + depth * 0.25;
      if (!best || score > best.score) best = { name: item.name, score };
    }

    if (item.children?.length) {
      const childBest = findBestMatch(pathname, item.children, depth + 1);
      if (childBest && (!best || childBest.score > best.score)) best = childBest;
    }
  }

  return best;
};

const getFallbackTitle = (pathname: string): string => {
  const pathParts = pathname.substring(1).split('/');
  return (
    pathParts.map((part) => part.charAt(0).toUpperCase() + part.slice(1).replace('-', ' ')).join(' - ') ||
    'پیشخوان مدیریتی کوروش'
  );
};

export const resolveCurrentPageTitle = (pathname: string, currentUser: AuthUser | null): string => {
  if (!currentUser) return 'ورود به سیستم';

  if (/^\/customers\/(\d+)$/.test(pathname)) return 'جزئیات مشتری';
  if (/^\/partners\/(\d+)$/.test(pathname)) return 'جزئیات همکار';

  const invoiceDetailMatch = pathname.match(/^\/invoices\/(\d+)$/);
  if (invoiceDetailMatch?.[1]) {
    return `فاکتور فروش شماره ${Number(invoiceDetailMatch[1]).toLocaleString('fa-IR')}`;
  }

  if (/^\/installment-sales\/(\d+)$/.test(pathname)) return 'جزئیات فروش اقساطی';
  if (pathname === '/installment-sales/new') return 'ثبت فروش اقساطی جدید';
  if (pathname === '/purchases') return 'کالاها';
  if (pathname === '/stock-counts') return 'انبارگردانی';
  if (pathname === '/tools/labelprint') return 'چاپ لیبل کالا';
  if (pathname === '/profile') return 'پروفایل کاربر';
  if (pathname === '/reports/sales-summary' || pathname === '/reports/sales') return 'فروش و سود';
  if (pathname === '/reports/collection-followup') return 'مرکز پیگیری وصول';
  if (pathname === '/reports/debtors') return 'گزارش بدهکاران';
  if (pathname === '/reports/creditors') return 'گزارش بستانکاران';
  if (pathname === '/reports/top-customers') return 'مشتریان برتر';
  if (pathname === '/reports/top-suppliers') return 'تامین کنندگان برتر';
  if (pathname === '/reports/analysis') return 'تحلیل هوشمند';
  if (pathname === '/reports/analysis/profitability') return 'سودآوری کالاها';
  if (pathname === '/reports/analysis/inventory') return 'تحلیل وضعیت انبار';
  if (pathname === '/reports/analysis/suggestions') return 'پیشنهادهای هوشمند خرید';

  if (pathname === '/') {
    return SIDEBAR_ITEMS.find((item) => item.id === 'dashboard')?.name || 'پیشخوان مدیریتی';
  }

  const best = findBestMatch(pathname, SIDEBAR_ITEMS);
  if (best) return best.name;
  return getFallbackTitle(pathname);
};

export const useCurrentPageTitle = (pathname: string, currentUser: AuthUser | null): string =>
  useMemo(() => resolveCurrentPageTitle(pathname, currentUser), [pathname, currentUser]);
