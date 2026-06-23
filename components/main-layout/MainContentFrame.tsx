import React from 'react';
import { Outlet } from 'react-router-dom';
import MobileBottomNav from '../MobileBottomNav';

interface MainContentFrameProps {
  onOpenMobileMenu: () => void;
}

export const MainContentFrame: React.FC<MainContentFrameProps> = ({ onOpenMobileMenu }) => (
  <>
    <main
      className="app-main-scroll flex-1 overflow-y-auto overflow-x-hidden bg-slate-50 dark:bg-slate-950 print:p-0 print:bg-white"
      data-ui-shell="main-scroll"
      style={{ padding: 'var(--app-page-gap)' }}
    >
      <Outlet />
    </main>
    <MobileBottomNav onMenuClick={onOpenMobileMenu} />
  </>
);
