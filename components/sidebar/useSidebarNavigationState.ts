import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';

import type { NavItem } from '../../types';
import type { SidebarBadgeMap } from './useSidebarBadges';
import type { SidebarFlyoutLayout } from './SidebarFlyoutPanel';
import { isItemActive } from './sidebarNavUtils';
import { useSidebarSearchReset } from './useSidebarSearchReset';

interface UseSidebarNavigationStateArgs {
  visibleItems: NavItem[];
  pathname: string;
  collapsed: boolean;
  navBadges: SidebarBadgeMap;
}

interface SidebarNavigationState {
  navQuery: string;
  setNavQuery: (value: string) => void;
  sidebarSearchInputRef: MutableRefObject<HTMLInputElement | null>;
  filteredByQuery: NavItem[];
  openGroups: Record<string, boolean>;
  hoveredGroupId: string | null;
  flyoutLayout: SidebarFlyoutLayout | null;
  flyoutItemRefs: MutableRefObject<Record<string, HTMLLIElement | null>>;
  toggleGroup: (id: string, parentId?: string) => void;
  handleCollapsedGroupEnter: (item: NavItem) => void;
  scheduleFlyoutClose: () => void;
  handleFlyoutPointerEnter: () => void;
  handleFlyoutPointerLeave: () => void;
  clearHoveredGroup: () => void;
  getBadgeCount: (item: NavItem) => number;
}

const filterItemsByQuery = (items: NavItem[], query: string): NavItem[] => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return items;

  const walk = (currentItems: NavItem[]): NavItem[] => {
    return currentItems
      .map((item) => {
        const nameMatch = item.name?.toLowerCase().includes(normalizedQuery);
        const childMatches = item.children?.length ? walk(item.children) : [];
        const keep = nameMatch || childMatches.length > 0;
        if (!keep) return null;
        return { ...item, children: childMatches.length ? childMatches : item.children };
      })
      .filter(Boolean) as NavItem[];
  };

  return walk(items);
};

const collectActiveGroupIds = (items: NavItem[], pathname: string): string[] => {
  let open: string[] = [];

  for (const item of items) {
    const active = isItemActive(pathname, item);
    if (active && item.children?.length) open.push(item.id);
    if (item.children?.length) open = open.concat(collectActiveGroupIds(item.children, pathname));
  }

  return open;
};

export const useSidebarNavigationState = ({
  visibleItems,
  pathname,
  collapsed,
  navBadges,
}: UseSidebarNavigationStateArgs): SidebarNavigationState => {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null);
  const [flyoutLayout, setFlyoutLayout] = useState<SidebarFlyoutLayout | null>(null);
  const [navQuery, setNavQuery] = useState('');

  const flyoutCloseTimer = useRef<number | null>(null);
  const flyoutItemRefs = useRef<Record<string, HTMLLIElement | null>>({});
  const sidebarSearchInputRef = useRef<HTMLInputElement | null>(null);

  useSidebarSearchReset(sidebarSearchInputRef);

  const filteredByQuery = useMemo(() => filterItemsByQuery(visibleItems, navQuery), [navQuery, visibleItems]);

  const getBadgeCount = useCallback((item: NavItem): number => {
    const keys = [item.id, item.path || ''];
    let ownCount = 0;

    for (const key of keys) {
      if (!key) continue;
      if (navBadges[key] != null) {
        ownCount = navBadges[key];
        break;
      }
    }

    const childrenCount = item.children?.reduce((sum, child) => sum + getBadgeCount(child), 0) ?? 0;
    return ownCount + childrenCount;
  }, [navBadges]);

  const updateFlyoutLayout = useCallback((groupId: string) => {
    const anchor = flyoutItemRefs.current[groupId];
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 12;
    const gap = 12;
    const panelWidth = Math.min(280, Math.max(248, viewportWidth - margin * 2));
    const flyoutItemCount = Number(anchor.dataset.flyoutCount || '0');
    const estimatedHeight = Math.min(420, 120 + flyoutItemCount * 58);

    const preferredLeft = rect.left - panelWidth - gap;
    const fallbackLeft = viewportWidth - panelWidth - margin;
    const left = Math.max(margin, preferredLeft >= margin ? preferredLeft : fallbackLeft);

    const maxTop = Math.max(margin, viewportHeight - estimatedHeight - margin);
    const top = Math.min(Math.max(rect.top, margin), maxTop);

    setFlyoutLayout({ left, top, width: panelWidth });
  }, []);

  const cancelFlyoutClose = useCallback(() => {
    if (flyoutCloseTimer.current !== null) {
      window.clearTimeout(flyoutCloseTimer.current);
      flyoutCloseTimer.current = null;
    }
  }, []);

  const scheduleFlyoutClose = useCallback(() => {
    cancelFlyoutClose();
    flyoutCloseTimer.current = window.setTimeout(() => {
      setHoveredGroupId(null);
    }, 180);
  }, [cancelFlyoutClose]);

  const handleCollapsedGroupEnter = useCallback((item: NavItem) => {
    cancelFlyoutClose();
    updateFlyoutLayout(item.id);
    setHoveredGroupId(item.id);
  }, [cancelFlyoutClose, updateFlyoutLayout]);

  const handleFlyoutPointerEnter = useCallback(() => {
    cancelFlyoutClose();
  }, [cancelFlyoutClose]);

  const handleFlyoutPointerLeave = useCallback(() => {
    scheduleFlyoutClose();
  }, [scheduleFlyoutClose]);

  const clearHoveredGroup = useCallback(() => {
    setHoveredGroupId(null);
  }, []);

  const toggleGroup = useCallback((id: string, parentId?: string) => {
    setOpenGroups((prev) => {
      const willOpen = !prev[id];
      // Accordion contract: در حالت عادی فقط یک شاخه از منو باز می‌ماند.
      // این کار هم زیرمنوی قبلی را می‌بندد، هم ظاهر selected کاذب را حذف می‌کند.
      if (!willOpen) {
        return parentId ? { [parentId]: true } : {};
      }
      return parentId ? { [parentId]: true, [id]: true } : { [id]: true };
    });
  }, []);

  useEffect(() => {
    const toOpen = new Set(collectActiveGroupIds(visibleItems, pathname));

    // فقط مسیر فعال باز بماند؛ بازماندن گروه‌های قبلی باعث حس selected اشتباه در سایدبار می‌شد.
    setOpenGroups(() => {
      const next: Record<string, boolean> = {};
      toOpen.forEach((id) => {
        next[id] = true;
      });
      return next;
    });
  }, [pathname, visibleItems]);

  useEffect(() => {
    return () => {
      if (flyoutCloseTimer.current !== null) {
        window.clearTimeout(flyoutCloseTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!collapsed || !hoveredGroupId) return;

    const syncPosition = () => updateFlyoutLayout(hoveredGroupId);
    syncPosition();

    window.addEventListener('resize', syncPosition);
    window.addEventListener('scroll', syncPosition, true);
    return () => {
      window.removeEventListener('resize', syncPosition);
      window.removeEventListener('scroll', syncPosition, true);
    };
  }, [collapsed, hoveredGroupId, updateFlyoutLayout]);

  return {
    navQuery,
    setNavQuery,
    sidebarSearchInputRef,
    filteredByQuery,
    openGroups,
    hoveredGroupId,
    flyoutLayout,
    flyoutItemRefs,
    toggleGroup,
    handleCollapsedGroupEnter,
    scheduleFlyoutClose,
    handleFlyoutPointerEnter,
    handleFlyoutPointerLeave,
    clearHoveredGroup,
    getBadgeCount,
  };
};
