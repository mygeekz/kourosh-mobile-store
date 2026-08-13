import type { NavItem } from '../../types';

export const isActivePath = (pathname: string, itemPath?: string): boolean => {
  if (!itemPath) return false;
  if (itemPath === '/') return pathname === '/';
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
};

export const isItemActive = (pathname: string, item: NavItem): boolean => {
  if (isActivePath(pathname, item.path)) return true;
  return item.children?.some((child) => isItemActive(pathname, child)) ?? false;
};

export const isExactRouteActive = (pathname: string, item: NavItem): boolean => {
  if (!item.path || item.children?.length) return false;
  return isActivePath(pathname, item.path);
};
