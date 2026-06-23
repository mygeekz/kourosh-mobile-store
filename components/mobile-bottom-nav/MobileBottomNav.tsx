import React from 'react';
import { MobileBottomNavItemLink } from './MobileBottomNavItemLink';
import { MobileBottomNavMenuButton } from './MobileBottomNavMenuButton';
import { MobileBottomNavPrimaryAction } from './MobileBottomNavPrimaryAction';
import { MobileBottomNavShell } from './MobileBottomNavShell';
import type { MobileBottomNavProps } from './mobileBottomNavTypes';
import { useMobileBottomNavigation } from './useMobileBottomNavigation';

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onMenuClick }) => {
  const { canUseQuickSale, goQuickAction, isActive, visibleBottomItems } = useMobileBottomNavigation();

  return (
    <MobileBottomNavShell>
      {visibleBottomItems.slice(0, 2).map((item) => (
        <MobileBottomNavItemLink key={item.id} item={item} isActive={isActive} />
      ))}

      <MobileBottomNavPrimaryAction canUseQuickSale={canUseQuickSale} onQuickAction={goQuickAction} />

      {visibleBottomItems.slice(2, 3).map((item) => (
        <MobileBottomNavItemLink key={item.id} item={item} isActive={isActive} />
      ))}

      <MobileBottomNavMenuButton onMenuClick={onMenuClick} />
    </MobileBottomNavShell>
  );
};

export default MobileBottomNav;
