export interface SidebarNavigationSection {
  id: string;
  label: string;
  itemIds: readonly string[];
}

/**
 * Presentation-only grouping for the canonical sidebar.
 *
 * Keep SIDEBAR_ITEMS as the single navigation/RBAC/feature-flag source of truth.
 * These sections only control how already-visible top-level items are grouped.
 */
export const SIDEBAR_NAV_SECTIONS: readonly SidebarNavigationSection[] = [
  {
    id: 'store',
    label: 'فروشگاه',
    itemIds: ['dashboard', 'sales', 'products-group', 'repairs-services', 'people'],
  },
  {
    id: 'management',
    label: 'مدیریت و تحلیل',
    itemIds: ['reports', 'more'],
  },
  {
    id: 'configuration',
    label: 'پیکربندی',
    itemIds: ['settings'],
  },
] as const;
