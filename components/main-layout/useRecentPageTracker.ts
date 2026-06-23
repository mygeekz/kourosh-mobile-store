import { useEffect } from 'react';
import { SIDEBAR_ITEMS } from '../../constants';
import type { AuthUser } from '../../types';
import { findNavByPath, normalizePath } from '../../utils/nav';
import { pushRecent } from '../../utils/recents';

interface RecentPageTrackerOptions {
  currentUser: AuthUser | null;
  fallbackTitle: string;
  pathname: string;
}

export const useRecentPageTracker = ({ currentUser, fallbackTitle, pathname }: RecentPageTrackerOptions): void => {
  useEffect(() => {
    const path = normalizePath(pathname);
    if (!currentUser) return;

    const match = findNavByPath(SIDEBAR_ITEMS, path);
    pushRecent({
      path,
      title: match?.title ?? fallbackTitle,
      icon: match?.icon,
      parentTitle: match?.parentTitle,
    });
  }, [currentUser, fallbackTitle, pathname]);
};
