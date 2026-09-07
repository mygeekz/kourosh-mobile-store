import React from 'react';
import { cn } from '../../utils/cn';
import { FontAwesomeIcon } from '@/components/ui';
interface MobileBottomNavPrimaryActionProps {
  canUseQuickSale: boolean;
  onQuickAction: () => void;
  active: boolean;
}

export const MobileBottomNavPrimaryAction: React.FC<MobileBottomNavPrimaryActionProps> = ({ canUseQuickSale, onQuickAction, active }) => (
  <button
    type="button"
    onClick={onQuickAction}
    disabled={!canUseQuickSale}
    className={cn(
      'mobile-bottom-nav-action unstyled-button no-ripple group relative flex h-[64px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-[18px] px-1',
      'text-primary transition-[color,transform,opacity] duration-200 focus-visible:outline-none active:scale-[0.97]',
      !canUseQuickSale && 'cursor-not-allowed opacity-45 active:scale-100',
    )}
    data-skip-global-button="true"
    aria-current={active ? 'page' : undefined}
    aria-label={canUseQuickSale ? 'ثبت اطلاعات فروش سریع؛ اکشن اصلی موبایل' : 'اکشن فروش سریع برای نقش فعلی فعال نیست'}
    title={canUseQuickSale ? 'اکشن اصلی موبایل: ثبت فروش سریع' : 'برای نقش فعلی در دسترس نیست'}
  >
    <span
      className={cn(
        'grid h-10 w-10 place-items-center rounded-[15px] border border-primary bg-primary text-primary-foreground shadow-sm',
        active && 'ring-2 ring-primary/25 ring-offset-1 ring-offset-background',
      )}
    >
      <FontAwesomeIcon icon="fa-solid fa-plus" className="text-[18px]" />
    </span>
    <span className="max-w-full truncate text-[10px] font-extrabold leading-4">فروش</span>
  </button>
);
