import React from 'react';
import { cn } from '../../utils/cn';
import FontAwesomeIcon from '../ui/FontAwesomeIcon';

interface MobileBottomNavPrimaryActionProps {
  canUseQuickSale: boolean;
  onQuickAction: () => void;
}

export const MobileBottomNavPrimaryAction: React.FC<MobileBottomNavPrimaryActionProps> = ({ canUseQuickSale, onQuickAction }) => (
  <button
    type="button"
    onClick={onQuickAction}
    disabled={!canUseQuickSale}
    className={cn(
      'mobile-bottom-nav-primary relative mx-auto h-12 w-12 rounded-2xl',
      'bg-primary text-primary-foreground shadow-md shadow-primary/30',
      'active:scale-95 transition-transform',
      !canUseQuickSale && 'cursor-not-allowed opacity-50 shadow-none active:scale-100',
    )}
    aria-label={canUseQuickSale ? 'ثبت اطلاعات فروش سریع؛ اکشن اصلی موبایل' : 'اکشن فروش سریع برای نقش فعلی فعال نیست'}
    title={canUseQuickSale ? 'اکشن اصلی موبایل: ثبت فروش سریع' : 'برای نقش فعلی در دسترس نیست'}
  >
    <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/15 to-transparent" />
    <FontAwesomeIcon icon="fa-solid fa-plus" className="text-lg" />
    <span className="sr-only">اکشن اصلی موبایل، نه جایگزین منوی هدر یا سایدبار</span>
  </button>
);
