// components/Sidebar.tsx
import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

import { SIDEBAR_ITEMS } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { useStyle } from '../contexts/StyleContext';
import { useFavorites } from '../contexts/FavoritesContext';
import { useFeatureFlags } from '../contexts/FeatureFlagsContext';
import { filterNavigationFavorites, filterNavigationItems } from '../utils/navigationPolicy';
import {
  SidebarBrandBar,
  SidebarFavorites,
  SidebarNavTree,
  SidebarSearch,
  SidebarSupport,
  useSidebarBadges,
  useSidebarBranding,
  useSidebarNavigationState,
} from './sidebar/index';

interface SidebarProps {
  /** Controls whether the sidebar is visible on mobile. On desktop this value is ignored */
  isOpen: boolean;
  /** Callback when the mobile sidebar wants to close */
  onClose?: () => void;

  /** Desktop mini mode (icon-only) */
  collapsed?: boolean;
  /** Called when user toggles collapse (desktop) */
  onToggleCollapse?: () => void;
  /** Explicit collapsed width (so layout matches MainLayout) */
  collapsedWidthPx?: number;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const collapsed = false;
  const collapsedWidthPx = 0;
  const { currentUser } = useAuth();
  const location = useLocation();
  const { style, computeSidebarWidthPx } = useStyle();
  const { flags: featureFlags } = useFeatureFlags();
  const { favorites, removeFavorite } = useFavorites();

  const roleName = currentUser?.roleName;
  const visibleItems = useMemo(() => filterNavigationItems(SIDEBAR_ITEMS, { roleName, featureFlags }), [roleName, featureFlags]);
  const visibleFavorites = useMemo(() => filterNavigationFavorites(favorites, { roleName, featureFlags }), [favorites, roleName, featureFlags]);
  const sidebarWidth = collapsed ? collapsedWidthPx : computeSidebarWidthPx();

  const { storeName, logoUrl, isLoadingSettings } = useSidebarBranding();

  const { navBadges } = useSidebarBadges();
  const {
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
  } = useSidebarNavigationState({
    visibleItems,
    pathname: location.pathname,
    collapsed,
    navBadges,
  });

  return (
    <div
      data-ui-navigation="sidebar"
      data-ui-shell="sidebar"
      data-sidebar-collapsed={collapsed ? 'true' : 'false'}
      data-sidebar-open={isOpen ? 'true' : 'false'}
      className={[
        'app-sidebar bg-white/95 dark:bg-slate-950/95 border-l border-gray-200 dark:border-slate-800 flex flex-col fixed h-full right-0 print:hidden overflow-hidden isolate backdrop-blur-xl',
        'transform transition-transform duration-300 ease-in-out',
        isOpen ? 'translate-x-0' : 'translate-x-full',
        'md:translate-x-0 md:transform-none',
        'z-[70]',
      ].join(' ')}
      // روی موبایل، سایدبار نباید از عرض صفحه بزرگ‌تر شود (به‌خصوص وقتی کاربر پهنای pill را زیاد کرده).
      // maxWidth با vw تضمین می‌کند Drawer همیشه خوش‌دست بماند.
      style={{ width: sidebarWidth, maxWidth: '86vw' }}
    >
      <SidebarBrandBar
        collapsed={collapsed}
        isLoadingSettings={isLoadingSettings}
        logoUrl={logoUrl}
        storeName={storeName}
      />

      <nav className="ux-nav-compact flex-1 overflow-y-auto overflow-x-hidden py-3" data-ui-navigation-region="main">
        {!collapsed && (
          <SidebarSearch inputRef={sidebarSearchInputRef} value={navQuery} onChange={setNavQuery} />
        )}

        {!collapsed && (
          <SidebarFavorites favorites={visibleFavorites} onRemoveFavorite={removeFavorite} />
        )}

        <SidebarNavTree
          items={filteredByQuery}
          pathname={location.pathname}
          collapsed={collapsed}
          style={style}
          openGroups={openGroups}
          hoveredGroupId={hoveredGroupId}
          flyoutLayout={flyoutLayout}
          flyoutItemRefs={flyoutItemRefs}
          onToggleGroup={toggleGroup}
          onClose={onClose}
          onCollapsedGroupEnter={handleCollapsedGroupEnter}
          onCollapsedGroupLeave={scheduleFlyoutClose}
          onFlyoutPointerEnter={handleFlyoutPointerEnter}
          onFlyoutPointerLeave={handleFlyoutPointerLeave}
          onClearHoveredGroup={clearHoveredGroup}
          getBadgeCount={getBadgeCount}
        />
      </nav>

      {!collapsed && <SidebarSupport />}
    </div>
  );
};

export default Sidebar;
