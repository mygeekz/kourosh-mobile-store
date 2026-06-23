import type { NavItem } from '../types';
import { canAccessPath, type RoleName } from './rbac';
import { filterNavItemsByFeatures, isFeatureEnabledForPath } from './featureFlags';

export type NavigationFeatureFlags = Record<string, boolean>;

export type NavigationPolicyContext = {
  roleName?: RoleName | null;
  featureFlags: NavigationFeatureFlags;
};

export type NavigationPolicyItem = NavItem;

export const navigationPolicySource = {
  roleAccess: 'utils/rbac.ts -> app/routes/routeAccessMatrix.ts',
  featureAccess: 'utils/featureFlags.ts -> app/routes/routeAccessMatrix.ts + FEATURE_FLAGS.navIds',
  navigationTree: 'constants.tsx SIDEBAR_ITEMS',
} as const;

export function canAccessNavigationPath(
  roleName: RoleName | undefined | null,
  featureFlags: NavigationFeatureFlags,
  path: string | undefined | null,
): boolean {
  if (!path || path.trim() === '') return true;
  return canAccessPath(roleName, path) && isFeatureEnabledForPath(featureFlags, path);
}

export function canAccessNavigationItem(
  item: Pick<NavItem, 'path' | 'children'>,
  context: NavigationPolicyContext,
): boolean {
  const selfAllowed = canAccessNavigationPath(context.roleName, context.featureFlags, item.path);
  if (selfAllowed) return true;
  return Boolean(item.children?.some((child) => canAccessNavigationItem(child, context)));
}

export function filterNavigationItems(
  items: readonly NavItem[],
  context: NavigationPolicyContext,
): NavItem[] {
  if (!context.roleName) return [];

  const roleAndPathFiltered = items
    .map((item): NavItem | null => {
      const children = item.children?.length ? filterNavigationItems(item.children, context) : undefined;
      const selfAllowed = item.path ? canAccessPath(context.roleName, item.path) : true;
      const keep = selfAllowed || Boolean(children?.length);
      if (!keep) return null;
      return { ...item, children };
    })
    .filter(Boolean) as NavItem[];

  return filterNavItemsByFeatures(roleAndPathFiltered, context.featureFlags);
}

export function filterNavigationFavorites<T extends { path: string }>(
  favorites: readonly T[],
  context: NavigationPolicyContext,
): T[] {
  return favorites.filter((favorite) => canAccessNavigationPath(context.roleName, context.featureFlags, favorite.path));
}
