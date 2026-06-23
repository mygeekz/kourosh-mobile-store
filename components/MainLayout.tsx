// components/MainLayout.tsx
import React, { useCallback, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import { CommandPalette } from './CommandPalette';
import { useAuth } from '../contexts/AuthContext';
import { useStyle } from '@contexts/StyleContext';
import {
  MainContentFrame,
  MainLayoutShell,
  useCommandPaletteShortcut,
  useCurrentPageTitle,
  useMainLayoutSidebar,
  useRecentPageTracker,
} from './main-layout/index';

const MainLayout: React.FC = () => {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const location = useLocation();
  const { currentUser } = useAuth();
  const { style } = useStyle();
  const sidebar = useMainLayoutSidebar(style);
  const pageTitle = useCurrentPageTitle(location.pathname, currentUser);

  const openCommandPalette = useCallback(() => setPaletteOpen(true), []);
  const closeCommandPalette = useCallback(() => setPaletteOpen(false), []);

  useCommandPaletteShortcut(openCommandPalette);
  useRecentPageTracker({ currentUser, fallbackTitle: pageTitle, pathname: location.pathname });

  return (
    <MainLayoutShell
      contentMarginRight={sidebar.contentMarginRight}
      isDesktop={sidebar.isDesktop}
      isSidebarOpen={sidebar.isSidebarOpen}
      onCloseSidebar={sidebar.closeSidebar}
    >
      <Header
        pageTitle={pageTitle}
        onToggleSidebar={sidebar.toggleSidebar}
        onOpenCommandPalette={openCommandPalette}
      />
      <MainContentFrame onOpenMobileMenu={sidebar.openSidebar} />
      <CommandPalette open={paletteOpen} onClose={closeCommandPalette} />
    </MainLayoutShell>
  );
};

export default MainLayout;
