import React from 'react';
import { MobileBottomNavItemLink } from './MobileBottomNavItemLink';
import { MobileBottomNavMenuButton } from './MobileBottomNavMenuButton';
import { MobileBottomNavPrimaryAction } from './MobileBottomNavPrimaryAction';
import { MobileBottomNavShell } from './MobileBottomNavShell';
import type { MobileBottomNavProps } from './mobileBottomNavTypes';
import { useMobileBottomNavigation } from './useMobileBottomNavigation';

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onMenuClick }) => {
  const {
    canUseQuickSale,
    goQuickAction,
    isActive,
    isMenuActive,
    isPrimaryActive,
    visibleBottomItems,
  } = useMobileBottomNavigation();
  const visibleItemsById = new Map(visibleBottomItems.map((item) => [item.id, item]));
  const renderDestination = (id: string) => {
    const item = visibleItemsById.get(id);
    return item
      ? <MobileBottomNavItemLink key={item.id} item={item} isActive={isActive} />
      : <span key={id} aria-hidden="true" />;
  };

  return (
    <MobileBottomNavShell>
      {renderDestination('dashboard')}
      {renderDestination('products')}
      <MobileBottomNavPrimaryAction
        active={isPrimaryActive}
        canUseQuickSale={canUseQuickSale}
        onQuickAction={goQuickAction}
      />
      {renderDestination('reports')}
      <MobileBottomNavMenuButton active={isMenuActive} onMenuClick={onMenuClick} />
    </MobileBottomNavShell>
  );
};

export default MobileBottomNav;
