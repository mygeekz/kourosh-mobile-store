import React from 'react';
import { cn } from '../../utils/cn';

interface MobileBottomNavShellProps {
  children: React.ReactNode;
}

export const MobileBottomNavShell: React.FC<MobileBottomNavShellProps> = ({ children }) => (
  <div className="mobile-bottom-nav-shell md:hidden fixed bottom-0 left-0 right-0 z-50 pointer-events-none" data-ui-navigation="mobile-bottom">
    <div className="pointer-events-auto mx-auto w-[min(560px,100%)] px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
      <div
        className={cn(
          'mobile-bottom-nav-surface relative h-16 rounded-2xl border border-border/70 bg-white/75 dark:bg-gray-900/70',
          'backdrop-blur-xl shadow-lg shadow-black/10 dark:shadow-black/30',
          'px-2',
        )}
      >
        <div className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-border/80 to-transparent" />
        <div className="grid h-full grid-cols-5 items-center">{children}</div>
      </div>
    </div>
  </div>
);
