import { useEffect, useMemo, useState } from 'react';
import type { StyleState } from '@contexts/StyleContext';

type MainLayoutStyle = StyleState;

export const APP_DESKTOP_NAV_BREAKPOINT_PX = 1024;

interface MainLayoutSidebarState {
  isDesktop: boolean;
  isSidebarOpen: boolean;
  sidebarWidthPx: number;
  contentMarginRight: number;
  closeSidebar: () => void;
  openSidebar: () => void;
  toggleSidebar: () => void;
}

export const useMainLayoutSidebar = (style: MainLayoutStyle): MainLayoutSidebarState => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= APP_DESKTOP_NAV_BREAKPOINT_PX : true,
  );

  useEffect(() => {
    const handleResize = () => {
      const isNowDesktop = window.innerWidth >= APP_DESKTOP_NAV_BREAKPOINT_PX;
      setIsDesktop(isNowDesktop);
      if (isNowDesktop) setIsSidebarOpen(false);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const sidebarWidthPx = useMemo(
    () => Math.max(196, Math.min(280, Number(style.sidebarPillWidthPx) || 272)),
    [style.sidebarPillWidthPx],
  );

  return {
    isDesktop,
    isSidebarOpen,
    sidebarWidthPx,
    contentMarginRight: isDesktop ? sidebarWidthPx : 0,
    closeSidebar: () => setIsSidebarOpen(false),
    openSidebar: () => setIsSidebarOpen(true),
    toggleSidebar: () => setIsSidebarOpen((value) => !value),
  };
};
