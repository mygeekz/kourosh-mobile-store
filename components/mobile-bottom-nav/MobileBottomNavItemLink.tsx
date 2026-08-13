import React from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { FontAwesomeIcon } from '@/components/ui';
import type { MobileBottomNavItem } from './mobileBottomNavTypes';
import { MobileBottomNavActivePill } from './MobileBottomNavActivePill';
import { getMobileBottomNavAriaLabel, getMobileBottomNavTitle } from './mobileBottomNavLabels';

interface MobileBottomNavItemLinkProps {
  item: MobileBottomNavItem;
  isActive: (path: string) => boolean;
}

export const MobileBottomNavItemLink: React.FC<MobileBottomNavItemLinkProps> = ({ item, isActive }) => (
  <NavLink
    to={item.path}
    aria-label={getMobileBottomNavAriaLabel(item)}
    title={getMobileBottomNavTitle(item)}
    className={({ isActive: linkActive }) =>
      cn(
        'mobile-bottom-nav-item group relative flex h-[60px] min-w-0 flex-col items-center justify-center gap-1 rounded-[16px] px-1 pt-2',
        'transition-[color,transform] duration-200 focus-visible:outline-none active:scale-[0.97]',
        linkActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
      )
    }
  >
    <MobileBottomNavActivePill active={isActive(item.path)} />

    <FontAwesomeIcon icon={item.icon} className="relative text-[19px]" />
    <span className="relative max-w-full truncate text-[10px] font-bold leading-4">{item.name}</span>
  </NavLink>
);
