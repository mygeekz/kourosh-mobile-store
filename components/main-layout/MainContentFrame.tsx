import React from 'react';
import { Outlet } from 'react-router-dom';
import MobileBottomNav from '../MobileBottomNav';

interface MainContentFrameProps {
  onOpenMobileMenu: () => void;
}

export const MainContentFrame: React.FC<MainContentFrameProps> = ({ onOpenMobileMenu }) => (
  <>
    <main
      className="app-main-scroll min-w-0 max-w-full flex-1 overflow-y-auto overflow-x-hidden bg-slate-50 dark:bg-slate-950 print:bg-white print:p-0"
      data-ui-shell="main-scroll"
      data-ui-responsive-boundary="main-scroll"
      style={{ padding: 'var(--app-page-gap)' }}
    >
      <Outlet />
    </main>
    <MobileBottomNav onMenuClick={onOpenMobileMenu} />
  </>
);
