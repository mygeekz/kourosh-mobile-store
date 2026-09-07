import React from 'react';
import { cn } from '../../utils/cn';
import { FontAwesomeIcon } from '@/components/ui';
interface MobileBottomNavMenuButtonProps {
  onMenuClick: () => void;
  active: boolean;
}

export const MobileBottomNavMenuButton: React.FC<MobileBottomNavMenuButtonProps> = ({ onMenuClick, active }) => (
  <button
    type="button"
    onClick={onMenuClick}
    className={cn(
      'mobile-bottom-nav-item unstyled-button no-ripple group relative flex h-[60px] min-w-0 flex-col items-center justify-center gap-1 rounded-[16px] px-1 pt-2',
      'transition-[color,transform] duration-200 focus-visible:outline-none active:scale-[0.97]',
      active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
    )}
    data-skip-global-button="true"
    aria-current={active ? 'page' : undefined}
    aria-label="بیشتر؛ باز کردن نقشه کامل ناوبری"
  >
    <span
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute left-1/2 top-1 h-1 w-5 -translate-x-1/2 rounded-full bg-primary transition-opacity',
        active ? 'opacity-100' : 'opacity-0',
      )}
    />
    <FontAwesomeIcon icon="fa-solid fa-bars" className="relative text-[19px]" />
    <span className="relative max-w-full truncate text-[10px] font-bold leading-4">منو</span>
  </button>
);
