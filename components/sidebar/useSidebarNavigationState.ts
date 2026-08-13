import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';

import type { NavItem } from '../../types';
import type { SidebarBadgeMap } from './useSidebarBadges';
import { isItemActive } from './sidebarNavUtils';

interface UseSidebarNavigationStateArgs {
  visibleItems: NavItem[];
  pathname: string;
  navBadges: SidebarBadgeMap;
}

interface SidebarNavigationState {
  navQuery: string;
  setNavQuery: (value: string) => void;
  sidebarSearchInputRef: MutableRefObject<HTMLInputElement | null>;
  filteredByQuery: NavItem[];
  openGroups: Record<string, boolean>;
  toggleGroup: (id: string, parentId?: string) => void;
  getBadgeCount: (item: NavItem) => number;
}

const filterItemsByQuery = (items: NavItem[], query: string): NavItem[] => {
  const normalizedQuery = query.trim().toLocaleLowerCase('fa');
  if (!normalizedQuery) return items;

  return items
    .map((item) => {
      const childMatches = item.children?.length ? filterItemsByQuery(item.children, query) : [];
      const nameMatch = item.name?.toLocaleLowerCase('fa').includes(normalizedQuery);
      if (!nameMatch && childMatches.length === 0) return null;
      return { ...item, children: childMatches.length ? childMatches : item.children };
    })
    .filter(Boolean) as NavItem[];
};

const collectActiveGroupIds = (items: NavItem[], pathname: string): string[] => {
  const ids: string[] = [];
  for (const item of items) {
    if (item.children?.length && isItemActive(pathname, item)) ids.push(item.id);
    if (item.children?.length) ids.push(...collectActiveGroupIds(item.children, pathname));
  }
  return ids;
};

const collectGroupIds = (items: NavItem[]): string[] => items.flatMap((item) => (
  item.children?.length ? [item.id, ...collectGroupIds(item.children)] : []
));

export const useSidebarNavigationState = ({
  visibleItems,
  pathname,
  navBadges,
}: UseSidebarNavigationStateArgs): SidebarNavigationState => {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [navQuery, setNavQuery] = useState('');
  const sidebarSearchInputRef = useRef<HTMLInputElement | null>(null);


  const filteredByQuery = useMemo(
    () => filterItemsByQuery(visibleItems, navQuery),
    [navQuery, visibleItems],
  );

  const getBadgeCount = useCallback((item: NavItem): number => {
    const ownCount = [item.id, item.path || '']
      .map((key) => navBadges[key])
      .find((value) => value != null) ?? 0;
    const childrenCount = item.children?.reduce((sum, child) => sum + getBadgeCount(child), 0) ?? 0;
    return ownCount + childrenCount;
  }, [navBadges]);

  const toggleGroup = useCallback((id: string, parentId?: string) => {
    setOpenGroups((current) => {
      const willOpen = !current[id];
      if (!willOpen) return parentId ? { [parentId]: true } : {};
      return parentId ? { [parentId]: true, [id]: true } : { [id]: true };
    });
  }, []);

  useEffect(() => {
    const ids = navQuery.trim()
      ? collectGroupIds(filteredByQuery)
      : collectActiveGroupIds(visibleItems, pathname);
    const next: Record<string, boolean> = {};
    ids.forEach((id) => { next[id] = true; });
    setOpenGroups(next);
  }, [filteredByQuery, navQuery, pathname, visibleItems]);

  return {
    navQuery,
    setNavQuery,
    sidebarSearchInputRef,
    filteredByQuery,
    openGroups,
    toggleGroup,
    getBadgeCount,
  };
};
