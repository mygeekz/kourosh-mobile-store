// components/Header.tsx
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useStyle } from '../contexts/StyleContext';
import { useFavorites } from '../contexts/FavoritesContext';
import { findNavByPath, normalizePath } from '../utils/nav';
import { SIDEBAR_ITEMS } from '../constants';
import { canAccessNavigationPath } from '../utils/navigationPolicy';
import { useFeatureFlags } from '../contexts/FeatureFlagsContext';
import {
  HeaderProfileMenu,
  HeaderQuickActions,
  HeaderRiskBadge,
  HeaderSearch,
  HeaderShell,
  HeaderThemeToggle,
  HeaderTitleArea,
  useHeaderCurrency,
  useHeaderProfileMenu,
  useHeaderQuickData,
  useHeaderSearch,
} from './header/index';


interface HeaderProps {
  pageTitle: string;
  onOpenCommandPalette?: () => void;
  /**
   * Called when the mobile sidebar toggle (hamburger) is clicked.
   * Optional because Header can be used on pages without a sidebar (e.g. login).
   */
  onToggleSidebar?: () => void;
}

const Header: React.FC<HeaderProps> = ({ pageTitle, onOpenCommandPalette }) => {
  const { isProfileMenuOpen, profileMenuRef, toggleProfileMenu } = useHeaderProfileMenu();
  const navigate = useNavigate();
  const location = useLocation();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { currentUser, token, logout, isLoading: authProcessLoading, authReady } = useAuth();
  const { flags: featureFlags, isEnabled: isFeatureEnabled } = useFeatureFlags();
  const headerSearch = useHeaderSearch({ token });

  // صفحه فعلی برای علاقه‌مندی‌ها
  const currentPath = normalizePath(location.pathname);
  const currentNav = findNavByPath(SIDEBAR_ITEMS, currentPath);
  const canFavorite = Boolean(currentNav?.path) && currentNav!.path !== '/login' && canAccessNavigationPath(currentUser?.roleName, featureFlags, currentNav!.path!);

  // ← StyleContext برای تغییر تم
  const { style, setStyle } = useStyle();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // سوییچر تم: light → dark → system
  const cycleTheme = () => {
    const order: Array<typeof style.theme> = ['light', 'dark', 'system'];
    const next = order[(order.indexOf(style.theme) + 1) % order.length];
    setStyle('theme', next);
  };



  const {
    headerCurrencyUnit,
    setHeaderCurrencyUnit,
    headerCurrencyLabel,
    formatMoney,
    formatMoneyPreview,
  } = useHeaderCurrency();

  const {
    headerQuickStats,
    headerRiskyCustomers,
    headerQuickLoading,
    headerFinancePulse,
    headerQuickPanels,
    refreshHeaderQuickPanels,
  } = useHeaderQuickData({
    authReady,
    token,
    currentUser,
    isFeatureEnabled,
    locationPathname: location.pathname,
  });

  if (authProcessLoading && !authReady) {
    return (
      <HeaderShell authState="loading">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{pageTitle || 'بارگذاری...'}</h2>
        <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 animate-pulse" />
      </HeaderShell>
    );
  }

  if (authReady && !currentUser) {
    return (
      <HeaderShell authState="guest">
        {/* When not authenticated, show the title only */}
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{pageTitle || 'ورود به سیستم'}</h2>
      </HeaderShell>
    );
  }

  return (
    <HeaderShell authState="authenticated">

      <HeaderTitleArea
        pageTitle={pageTitle}
        currentNav={currentNav}
        canFavorite={canFavorite}
        isFavorite={isFavorite}
        toggleFavorite={toggleFavorite}
      />

      <HeaderSearch
        {...headerSearch}
        onOpenCommandPalette={onOpenCommandPalette}
      />

      {/* Right controls */}
      <div className="flex items-center gap-1.5">
        <HeaderRiskBadge headerRiskyCustomers={headerRiskyCustomers} />
        <HeaderQuickActions
          roleName={currentUser?.roleName}
          featureFlags={featureFlags}
          isFeatureEnabled={isFeatureEnabled}
          headerQuickStats={headerQuickStats}
          headerQuickLoading={headerQuickLoading}
          headerQuickPanels={headerQuickPanels}
          headerFinancePulse={headerFinancePulse}
          headerCurrencyUnit={headerCurrencyUnit}
          setHeaderCurrencyUnit={setHeaderCurrencyUnit}
          headerCurrencyLabel={headerCurrencyLabel}
          formatMoney={formatMoney}
          formatMoneyPreview={formatMoneyPreview}
          refreshHeaderQuickPanels={refreshHeaderQuickPanels}
        />

        <HeaderThemeToggle theme={style.theme} onCycleTheme={cycleTheme} />

        <HeaderProfileMenu
          currentUser={currentUser}
          isOpen={isProfileMenuOpen}
          onToggle={toggleProfileMenu}
          onLogout={handleLogout}
          menuRef={profileMenuRef}
        />
      </div>
    </HeaderShell>
  );
};

export default Header;
