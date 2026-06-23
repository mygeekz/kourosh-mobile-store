import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useFeatureFlags } from '../../contexts/FeatureFlagsContext';
import { canAccessNavigationPath } from '../../utils/navigationPolicy';
import { BOTTOM_NAV_ITEMS, QUICK_SALE_PATH } from './mobileBottomNavItems';

export const useMobileBottomNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { flags: featureFlags } = useFeatureFlags();
  const roleName = currentUser?.roleName;

  const visibleBottomItems = useMemo(
    () => BOTTOM_NAV_ITEMS.filter((item) => canAccessNavigationPath(roleName, featureFlags, item.path)),
    [roleName, featureFlags],
  );

  const canUseQuickSale = canAccessNavigationPath(roleName, featureFlags, QUICK_SALE_PATH);

  const isActive = (path: string): boolean => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const goQuickAction = (): void => {
    if (!canUseQuickSale) return;
    // Central primary action: fast sale. If the route changes later, this remains the single source.
    navigate(QUICK_SALE_PATH);
  };

  return {
    canUseQuickSale,
    goQuickAction,
    isActive,
    visibleBottomItems,
  };
};
