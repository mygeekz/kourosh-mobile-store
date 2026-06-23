import React from 'react';
import Sidebar from '../Sidebar';

interface MainLayoutShellProps {
  children: React.ReactNode;
  contentMarginRight: number;
  isDesktop: boolean;
  isSidebarOpen: boolean;
  onCloseSidebar: () => void;
}

export const MainLayoutShell: React.FC<MainLayoutShellProps> = ({
  children,
  contentMarginRight,
  isDesktop,
  isSidebarOpen,
  onCloseSidebar,
}) => (
  <div
    className="app-layout-shell flex min-h-[100dvh] h-[100dvh] bg-gray-100 dark:bg-gray-900 relative overflow-hidden"
    data-ui-shell="app-layout"
  >
    <Sidebar isOpen={isDesktop || isSidebarOpen} onClose={onCloseSidebar} />

    {!isDesktop && isSidebarOpen && (
      <div
        onClick={onCloseSidebar}
        className="app-sidebar-overlay fixed inset-0 bg-black/40 z-[60] md:hidden"
        data-ui-navigation-overlay="sidebar"
      />
    )}

    <div
      className="app-content-shell flex-1 flex flex-col transition-all duration-300 ease-in-out pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0 min-w-0"
      data-ui-shell="content"
      style={{ marginRight: contentMarginRight }}
    >
      {children}
    </div>
  </div>
);
