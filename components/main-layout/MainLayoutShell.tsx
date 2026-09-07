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
    className="app-layout-shell relative flex h-[100dvh] min-h-[100dvh] min-w-0 max-w-full overflow-hidden bg-gray-100 dark:bg-gray-900"
    data-ui-shell="app-layout"
  >
    <Sidebar isOpen={isDesktop || isSidebarOpen} onClose={isDesktop ? undefined : onCloseSidebar} />

    {!isDesktop && isSidebarOpen && (
      <div
        onClick={onCloseSidebar}
        className="app-sidebar-backdrop lg:hidden"
        data-ui-navigation-overlay="sidebar"
      />
    )}

    <div
      className="app-content-shell flex min-w-0 max-w-full flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] transition-all duration-300 ease-in-out lg:pb-0"
      data-ui-shell="content"
      data-ui-responsive-boundary="content"
      style={{ marginRight: contentMarginRight }}
    >
      {children}
    </div>
  </div>
);
