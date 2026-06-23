import React from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../utils/cn';
import FontAwesomeIcon from '../ui/FontAwesomeIcon';
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
        'mobile-bottom-nav-item relative flex h-full flex-col items-center justify-center gap-1 rounded-xl',
        'transition-colors duration-200',
        linkActive ? 'text-primary' : 'text-muted-foreground',
      )
    }
  >
    <MobileBottomNavActivePill active={isActive(item.path)} />

    <div className="relative">
      <FontAwesomeIcon icon={item.icon} className="text-[18px]" />
    </div>
    <span className="relative text-[10px] font-medium leading-none">{item.name}</span>
  </NavLink>
);
