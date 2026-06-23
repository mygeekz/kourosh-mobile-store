import { useEffect, useMemo, useState } from 'react';
import type { StyleState } from '@contexts/StyleContext';

type MainLayoutStyle = StyleState;

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
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true,
  );

  useEffect(() => {
    const handleResize = () => {
      const isNowDesktop = window.innerWidth >= 768;
      setIsDesktop(isNowDesktop);
      if (isNowDesktop) setIsSidebarOpen(false);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const sidebarWidthPx = useMemo(
    () =>
      style.sidebarVariant === 'pill'
        ? Math.max(360, Math.min(390, Number(style.sidebarPillWidthPx) || 372))
        : 360,
    [style.sidebarPillWidthPx, style.sidebarVariant],
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
