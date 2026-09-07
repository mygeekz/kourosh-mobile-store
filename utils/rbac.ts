// utils/rbac.ts
import { routeAccessMatrix } from '../app/routes/routeAccessMatrix';
import type { RouteAccessMatrixEntry } from '../app/routes/routeAccessMatrix';
import type { NavItem } from '../types';

/** نقش‌های شناخته‌شده در سیستم (از سمت سرور) */
export type RoleName =
  | 'Admin'
  | 'Manager'
  | 'Salesperson'
  | 'Warehouse'
  | 'Technician'
  | 'Marketer'
  | (string & {});

type RouteRule = RouteAccessMatrixEntry & {
  normalizedPath: string;
  isExactPath: boolean;
  matcher: RegExp | null;
};

const APP_ROUTE_ACCESS_SOURCE = 'app/routes/routeAccessMatrix.ts';
const CATCH_ALL_PATH = '*';

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const toAbsolutePath = (path: string): string => {
  if (!path || path === CATCH_ALL_PATH) return path;
  return path.startsWith('/') ? path : `/${path}`;
};

/** نرمال‌سازی مسیر (حذف query/hash و اسلش انتهایی) */
export function normalizeAppPath(path: string): string {
  const clean = path.split('?')[0]?.split('#')[0] ?? path;
  const absolute = toAbsolutePath(clean.trim());
  return absolute.length > 1 ? absolute.replace(/\/+$/, '') : absolute;
}

const toRouteMatcher = (path: string): RegExp | null => {
  if (path === CATCH_ALL_PATH) return null;

  const normalized = normalizeAppPath(path);
  const segments = normalized.split('/').filter(Boolean);
  const pattern = segments
    .map((segment) => {
      if (segment === '*') return '.*';
      if (segment.startsWith(':')) return '[^/]+';
      return escapeRegExp(segment);
    })
    .join('/');

  if (!pattern) return /^\/$/;
  return new RegExp(`^/${pattern}$`);
};

const hasDynamicSegment = (path: string): boolean => path.includes('/:') || path.includes('*');

const routeAccessRules: readonly RouteRule[] = routeAccessMatrix
  .filter((entry) => entry.effectivePath !== CATCH_ALL_PATH)
  .map((entry) => {
    const normalizedPath = normalizeAppPath(entry.effectivePath);
    return {
      ...entry,
      normalizedPath,
      isExactPath: !hasDynamicSegment(normalizedPath),
      matcher: toRouteMatcher(normalizedPath),
    };
  })
  .sort((a, b) => {
    if (a.isExactPath !== b.isExactPath) return a.isExactPath ? -1 : 1;
    return b.normalizedPath.length - a.normalizedPath.length;
  });

const isPrefixMatch = (rule: RouteRule, path: string): boolean => {
  if (!rule.isExactPath) return false;
  if (rule.normalizedPath === '/') return path === '/';
  return path.startsWith(`${rule.normalizedPath}/`);
};

export function getRouteAccessEntryForPath(path: string): RouteAccessMatrixEntry | undefined {
  const normalizedPath = normalizeAppPath(path);

  const exactMatch = routeAccessRules.find(
    (rule) => rule.isExactPath && rule.normalizedPath === normalizedPath,
  );
  if (exactMatch) return exactMatch;

  const patternMatch = routeAccessRules.find(
    (rule) => !rule.isExactPath && Boolean(rule.matcher?.test(normalizedPath)),
  );
  if (patternMatch) return patternMatch;

  return routeAccessRules.find((rule) => isPrefixMatch(rule, normalizedPath));
}

/** آیا این نقش اجازه ورود به مسیر را دارد؟ */
export function canAccessPath(roleName: RoleName | undefined | null, path: string): boolean {
  if (!roleName) return false;

  const entry = getRouteAccessEntryForPath(path);
  if (!entry) {
    // Backward-compatible fallback: مسیرهای داخل اپ که در matrix نیامده‌اند، برای کاربر لاگین‌شده باز می‌مانند.
    return true;
  }

  if (entry.access === 'public' || entry.access === 'authenticated') return true;
  return entry.allowedRoles.includes(roleName);
}

export function hasAnyRole(roleName: RoleName | undefined | null, roles: readonly RoleName[] | undefined | null): boolean {
  if (!roles || roles.length === 0) return true;
  if (!roleName) return false;
  return roles.includes(roleName);
}

export function canPerformAction(roleName: RoleName | undefined | null, options?: {
  roles?: readonly RoleName[];
  path?: string;
}): boolean {
  if (!roleName) return false;
  if (options?.roles && options.roles.length > 0) return hasAnyRole(roleName, options.roles);
  if (options?.path) return canAccessPath(roleName, options.path);
  return true;
}

/** فیلتر کردن منوها بر اساس نقش کاربر */
export function filterNavItemsByRole(items: NavItem[], roleName: RoleName | undefined | null): NavItem[] {
  if (!roleName) return [];
  const walk = (arr: NavItem[]): NavItem[] =>
    arr
      .map((it) => {
        const children = it.children ? walk(it.children) : undefined;
        const selfAllowed = it.path ? canAccessPath(roleName, it.path) : true;
        const keep = selfAllowed || (children && children.length > 0);
        if (!keep) return null;
        return { ...it, children };
      })
      .filter(Boolean) as NavItem[];

  return walk(items);
}

/** دسترسی‌های سطح عملیات (UI) */
export function canManageProducts(roleName: RoleName | undefined | null): boolean {
  return hasAnyRole(roleName, ['Admin', 'Manager', 'Warehouse']);
}

export const rbacAccessPolicySource = APP_ROUTE_ACCESS_SOURCE;
