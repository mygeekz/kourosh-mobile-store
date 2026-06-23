import React from 'react';
import { cn } from '../../utils/cn';
import FontAwesomeIcon from '../ui/FontAwesomeIcon';

interface MobileBottomNavMenuButtonProps {
  onMenuClick: () => void;
}

export const MobileBottomNavMenuButton: React.FC<MobileBottomNavMenuButtonProps> = ({ onMenuClick }) => (
  <button
    type="button"
    onClick={onMenuClick}
    className={cn(
      'mobile-bottom-nav-item relative flex h-full flex-col items-center justify-center gap-1 rounded-xl',
      'text-muted-foreground active:scale-95 transition-transform',
    )}
    aria-label="بیشتر؛ باز کردن نقشه کامل ناوبری"
  >
    <div className="relative">
      <FontAwesomeIcon icon="fa-solid fa-bars" className="text-[18px]" />
    </div>
    <span className="text-[10px] font-medium leading-none">نقشه</span>
  </button>
);
