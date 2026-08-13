import React from 'react';
import { cn } from '../../utils/cn';

interface MobileBottomNavShellProps {
  children: React.ReactNode;
}

export const MobileBottomNavShell: React.FC<MobileBottomNavShellProps> = ({ children }) => (
  <nav
    className="mobile-bottom-nav-shell pointer-events-none fixed inset-x-0 bottom-0 z-50 md:hidden"
    data-ui-navigation="mobile-bottom"
    aria-label="ناوبری اصلی موبایل"
  >
    <div className="pointer-events-auto mx-auto w-full max-w-[560px] px-3 pb-3">
      <div
        className={cn(
          'mobile-bottom-nav-surface relative h-[72px] rounded-[26px] border border-border/80 bg-card/95',
          'shadow-[0_18px_48px_-28px_rgba(15,23,42,0.5)] backdrop-blur-xl',
          'px-1.5',
        )}
      >
        <div className="grid h-full grid-cols-5 items-center gap-0.5">{children}</div>
      </div>
    </div>
  </nav>
);
