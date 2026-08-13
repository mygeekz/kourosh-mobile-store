import { useMemo } from 'react';
import type { AuthUser } from '../../types';
import { resolveNavigationContext } from '../../utils/navigationContext';

export const resolveCurrentPageTitle = (pathname: string, currentUser: AuthUser | null): string => {
  if (!currentUser) return 'ورود به سیستم';
  return resolveNavigationContext(pathname).pageTitle;
};

export const useCurrentPageTitle = (pathname: string, currentUser: AuthUser | null): string =>
  useMemo(() => resolveCurrentPageTitle(pathname, currentUser), [pathname, currentUser]);
