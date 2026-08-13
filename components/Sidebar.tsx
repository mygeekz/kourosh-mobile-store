import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

import { SIDEBAR_ITEMS } from '../constants';
import { useAuth } from '../contexts/AuthContext';
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
  isOpen: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { currentUser } = useAuth();
  const location = useLocation();
  const { flags: featureFlags } = useFeatureFlags();
  const { favorites, removeFavorite } = useFavorites();

  const roleName = currentUser?.roleName;
  const visibleItems = useMemo(
    () => filterNavigationItems(SIDEBAR_ITEMS, { roleName, featureFlags }),
    [featureFlags, roleName],
  );
  const visibleFavorites = useMemo(
    () => filterNavigationFavorites(favorites, { roleName, featureFlags }),
    [favorites, featureFlags, roleName],
  );

  const { storeName, logoUrl, isLoadingSettings } = useSidebarBranding();
  const { navBadges, styleQualityBadges } = useSidebarBadges();
  const {
    navQuery,
    setNavQuery,
    sidebarSearchInputRef,
    filteredByQuery,
    openGroups,
    toggleGroup,
    getBadgeCount,
  } = useSidebarNavigationState({
    visibleItems,
    pathname: location.pathname,
    navBadges,
  });

  return (
    <aside
      data-sidebar-contract="canonical"
      data-sidebar-open={isOpen ? 'true' : 'false'}
      className="app-sidebar-shell print:hidden"
      aria-label="ناوبری اصلی"
    >
      <SidebarBrandBar
        isLoadingSettings={isLoadingSettings}
        logoUrl={logoUrl}
        storeName={storeName}
        onClose={onClose}
      />

      <div className="app-sidebar-scroll" data-sidebar-scroll="true">
        <SidebarSearch
          inputRef={sidebarSearchInputRef}
          value={navQuery}
          onChange={setNavQuery}
        />

        <SidebarFavorites
          favorites={visibleFavorites}
          onRemoveFavorite={removeFavorite}
          onNavigate={onClose}
        />

        <SidebarNavTree
          items={filteredByQuery}
          pathname={location.pathname}
          openGroups={openGroups}
          onToggleGroup={toggleGroup}
          onClose={onClose}
          getBadgeCount={getBadgeCount}
          styleQualityBadges={styleQualityBadges}
          expandSections={Boolean(navQuery.trim())}
        />
      </div>

      <SidebarSupport />
    </aside>
  );
};

export default Sidebar;
