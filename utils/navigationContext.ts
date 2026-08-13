import { SIDEBAR_ITEMS } from '../constants';
import { SIDEBAR_NAV_SECTIONS } from '../config/ui/sidebar-sections';
import type { NavItem } from '../types';
import { normalizePath } from './nav';

export type NavigationContext = {
  pathname: string;
  pageTitle: string;
  sectionId?: string;
  sectionLabel?: string;
  rootItemId?: string;
  rootItemLabel?: string;
  matchedItemId?: string;
  matchedItemLabel?: string;
  breadcrumbLabels: string[];
};

type NavMatch = {
  item: NavItem;
  ancestors: NavItem[];
  score: number;
};

type ContextOverride = {
  title: string;
  anchorId?: string;
};

const pathMatches = (pathname: string, candidate: string): boolean => {
  if (candidate === '/') return pathname === '/';
  return pathname === candidate || pathname.startsWith(`${candidate}/`);
};

const findBestPathMatch = (
  pathname: string,
  items: NavItem[],
  ancestors: NavItem[] = [],
  depth = 0,
): NavMatch | null => {
  let best: NavMatch | null = null;

  for (const item of items) {
    if (item.path && pathMatches(pathname, item.path)) {
      const score = item.path.length + depth * 0.25;
      if (!best || score > best.score) best = { item, ancestors, score };
    }

    if (item.children?.length) {
      const childBest = findBestPathMatch(pathname, item.children, [...ancestors, item], depth + 1);
      if (childBest && (!best || childBest.score > best.score)) best = childBest;
    }
  }

  return best;
};

const findById = (
  id: string,
  items: NavItem[] = SIDEBAR_ITEMS,
  ancestors: NavItem[] = [],
): NavMatch | null => {
  for (const item of items) {
    if (item.id === id) return { item, ancestors, score: Number.MAX_SAFE_INTEGER };
    if (item.children?.length) {
      const child = findById(id, item.children, [...ancestors, item]);
      if (child) return child;
    }
  }
  return null;
};

const getContextOverride = (pathname: string): ContextOverride | null => {
  if (/^\/customers\/(\d+)$/.test(pathname)) return { title: 'جزئیات مشتری', anchorId: 'customers' };
  if (/^\/partners\/(\d+)$/.test(pathname)) return { title: 'جزئیات همکار', anchorId: 'partners' };

  const invoiceDetailMatch = pathname.match(/^\/invoices\/(\d+)$/);
  if (invoiceDetailMatch?.[1]) {
    return {
      title: `فاکتور فروش شماره ${Number(invoiceDetailMatch[1]).toLocaleString('fa-IR')}`,
      anchorId: 'invoices',
    };
  }

  if (/^\/installment-sales\/(\d+)$/.test(pathname)) return { title: 'جزئیات فروش اقساطی', anchorId: 'installment-sales' };
  if (pathname === '/installment-sales/new') return { title: 'ثبت فروش اقساطی جدید', anchorId: 'installment-sales' };
  if (pathname === '/accounting-reconciliation') return { title: 'مرکز تطبیق حسابداری', anchorId: 'more' };
  if (pathname === '/purchases') return { title: 'کالاها', anchorId: 'products-group' };
  if (pathname === '/stock-counts') return { title: 'انبارگردانی', anchorId: 'products-group' };
  if (pathname === '/tools/labelprint') return { title: 'چاپ لیبل کالا', anchorId: 'products-group' };
  if (pathname === '/profile') return { title: 'پروفایل کاربر' };
  if (pathname === '/reports/sales') return { title: 'فروش و سود', anchorId: 'sales-summary' };
  if (pathname === '/reports/all-sales-ledger') return { title: 'دفتر جامع فروش و سود', anchorId: 'reports' };
  if (pathname === '/reports/collection-followup') return { title: 'مرکز پیگیری وصول', anchorId: 'reports' };
  if (pathname === '/reports/debtors') return { title: 'گزارش بدهکاران', anchorId: 'reports' };
  if (pathname === '/reports/creditors') return { title: 'گزارش بستانکاران', anchorId: 'reports' };
  if (pathname === '/reports/top-customers') return { title: 'مشتریان برتر', anchorId: 'reports' };
  if (pathname === '/reports/top-suppliers') return { title: 'تامین کنندگان برتر', anchorId: 'reports' };
  if (pathname === '/reports/analysis') return { title: 'تحلیل هوشمند', anchorId: 'reports' };
  if (pathname === '/reports/analysis/profitability') return { title: 'سودآوری کالاها', anchorId: 'reports' };
  if (pathname === '/reports/analysis/inventory') return { title: 'تحلیل وضعیت انبار', anchorId: 'reports' };
  if (pathname === '/reports/analysis/suggestions') return { title: 'پیشنهادهای هوشمند خرید', anchorId: 'reports' };
  return null;
};

const getFallbackTitle = (pathname: string): string => {
  const pathParts = pathname.substring(1).split('/').filter(Boolean);
  return (
    pathParts.map((part) => part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' ')).join(' - ') ||
    'پیشخوان مدیریتی کوروش'
  );
};

const findSectionForRoot = (rootItemId?: string) => {
  if (!rootItemId) return undefined;
  return SIDEBAR_NAV_SECTIONS.find((section) => section.itemIds.includes(rootItemId));
};

export const resolveNavigationContext = (rawPathname: string): NavigationContext => {
  const pathname = normalizePath(rawPathname || '/');
  const override = getContextOverride(pathname);
  const match = override?.anchorId ? findById(override.anchorId) : findBestPathMatch(pathname, SIDEBAR_ITEMS);

  const matchedChain = match ? [...match.ancestors, match.item] : [];
  const rootItem = matchedChain[0];
  const section = findSectionForRoot(rootItem?.id);
  const pageTitle = override?.title || match?.item.name || getFallbackTitle(pathname);
  const isDirectNavigationPage = !override && Boolean(match?.item) && pageTitle === match?.item.name;
  const contextChain = isDirectNavigationPage ? matchedChain.slice(0, -1) : matchedChain;

  const breadcrumbLabels = [
    section?.label,
    ...contextChain.map((item) => item.name),
  ].filter((label): label is string => Boolean(label));

  return {
    pathname,
    pageTitle,
    sectionId: section?.id,
    sectionLabel: section?.label,
    rootItemId: rootItem?.id,
    rootItemLabel: rootItem?.name,
    matchedItemId: match?.item.id,
    matchedItemLabel: match?.item.name,
    breadcrumbLabels,
  };
};


export const getNavigationContextSummary = (rawPathname: string, maxLevels = 2): string => {
  const labels = resolveNavigationContext(rawPathname).breadcrumbLabels
    .filter((label, index, all) => label && all.indexOf(label) === index);
  if (!labels.length) return '';
  return labels.slice(0, Math.max(1, maxLevels)).join(' · ');
};
