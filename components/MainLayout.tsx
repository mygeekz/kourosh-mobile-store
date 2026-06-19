// components/MainLayout.tsx
import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileBottomNav from './MobileBottomNav';
import { CommandPalette } from './CommandPalette';
import { useAuth } from '../contexts/AuthContext';
import { SIDEBAR_ITEMS } from '../constants';
import { useStyle } from '@contexts/StyleContext'; // ⬅️ alias جدید
import { NavItem } from '../types';
import { findNavByPath, normalizePath } from '../utils/nav';
import { pushRecent } from '../utils/recents';

const MainLayout: React.FC = () => {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const location = useLocation();
  const { currentUser } = useAuth();
  const { style } = useStyle();

  // Ctrl/Cmd + K → جستجوی سریع
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isK = String(e.key || '').toLowerCase() === 'k';
      const isMod = e.ctrlKey || e.metaKey;

      // جلوگیری از تداخل هنگام تایپ داخل input/textarea
      const tag = (document.activeElement as HTMLElement | null)?.tagName?.toLowerCase();
      const isTyping =
        tag === 'input' ||
        tag === 'textarea' ||
        (document.activeElement as HTMLElement | null)?.isContentEditable;

      if (isMod && isK && !isTyping) {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // ثبت اطلاعات صفحات اخیر (Recent)
  useEffect(() => {
    const path = normalizePath(location.pathname);
    if (!currentUser) return;

    const match = findNavByPath(SIDEBAR_ITEMS, path);
    pushRecent({
      path,
      title: match?.title ?? getCurrentPageTitle(),
      icon: match?.icon,
      parentTitle: match?.parentTitle,
    });
  }, [location.pathname, currentUser]);

  // ──────────────────────────────────────────────────────────────
  // Responsive sidebar state
  //   - isSidebarOpen: controls drawer visibility on small screens
  //   - isDesktop: true if viewport ≥ 768px (md breakpoint)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' ? window.innerWidth >= 768 : true);

  useEffect(() => {
    // Handle resize to toggle desktop/mobile mode
    const handleResize = () => {
      const isNowDesktop = window.innerWidth >= 768;
      setIsDesktop(isNowDesktop);
      // Automatically close the drawer when switching to desktop
      if (isNowDesktop) setIsSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getCurrentPageTitle = () => {
    if (!currentUser) return 'ورود به سیستم';
    const customerDetailMatch = location.pathname.match(/^\/customers\/(\d+)$/);
    if (customerDetailMatch) return 'جزئیات مشتری';
    const partnerDetailMatch = location.pathname.match(/^\/partners\/(\d+)$/);
    if (partnerDetailMatch) return 'جزئیات همکار';
    const invoiceDetailMatch = location.pathname.match(/^\/invoices\/(\d+)$/);
    if (invoiceDetailMatch?.[1]) {
      return `فاکتور فروش شماره ${Number(invoiceDetailMatch[1]).toLocaleString('fa-IR')}`;
    }
    const installmentSaleDetailMatch = location.pathname.match(/^\/installment-sales\/(\d+)$/);
    if (installmentSaleDetailMatch) return 'جزئیات فروش اقساطی';
    if (location.pathname === '/installment-sales/new') return 'ثبت فروش اقساطی جدید';
    if (location.pathname === '/purchases') return 'کالاها';
    if (location.pathname === '/stock-counts') return 'انبارگردانی';
    if (location.pathname === '/tools/labelprint') return 'چاپ لیبل کالا';
    if (location.pathname === '/profile') return 'پروفایل کاربر';
    if (location.pathname === '/reports/sales-summary' || location.pathname === '/reports/sales') return 'فروش و سود';
    if (location.pathname === '/reports/collection-followup') return 'مرکز پیگیری وصول';
    if (location.pathname === '/reports/debtors') return 'گزارش بدهکاران';
    if (location.pathname === '/reports/creditors') return 'گزارش بستانکاران';
    if (location.pathname === '/reports/top-customers') return 'مشتریان برتر';
    if (location.pathname === '/reports/top-suppliers') return 'تامین کنندگان برتر';
    if (location.pathname === '/reports/analysis') return 'تحلیل هوشمند';
    if (location.pathname === '/reports/analysis/profitability') return 'سودآوری کالاها';
    if (location.pathname === '/reports/analysis/inventory') return 'تحلیل وضعیت انبار';
    if (location.pathname === '/reports/analysis/suggestions') return 'پیشنهادهای هوشمند خرید';
    if (location.pathname === '/') {
      // داشبورد همیشه ریشه است
      return SIDEBAR_ITEMS.find(item => item.id === 'dashboard')?.name || 'پیشخوان مدیریتی';
    }

    // --- جستجوی منوی درختی: بهترین تطابق (طول مسیر + عمق)
    const findBestMatch = (items: NavItem[], depth = 0): { name: string; score: number } | null => {
      let best: { name: string; score: number } | null = null;
      for (const it of items) {
        if (it.path && it.path !== '/' && location.pathname.startsWith(it.path)) {
          const score = it.path.length + depth * 0.25;
          if (!best || score > best.score) best = { name: it.name, score };
        }
        if (it.children?.length) {
          const childBest = findBestMatch(it.children, depth + 1);
          if (childBest && (!best || childBest.score > best.score)) best = childBest;
        }
      }
      return best;
    };

    const best = findBestMatch(SIDEBAR_ITEMS);
    if (best) return best.name;
    const pathParts = location.pathname.substring(1).split('/');
    return (
      pathParts.map(part => part.charAt(0).toUpperCase() + part.slice(1).replace('-', ' ')).join(' - ')
      || 'پیشخوان مدیریتی کوروش'
    );
  };

  const sidebarWidthPx =
    style.sidebarVariant === 'pill'
      ? Math.max(360, Math.min(390, Number(style.sidebarPillWidthPx) || 372))
      : 360;

  // Desktop sidebar is always full-size. Mini/collapsed sidebar mode is intentionally disabled.
  const contentMarginRight = isDesktop ? sidebarWidthPx : 0;

  return (
    // نکته: برای موبایل، h-screen روی بعضی مرورگرها (به‌خصوص iOS/Chrome موبایل)
    // با نوار آدرس/ژست‌ها مشکل دارد. dvh ارتفاع واقعی ویوپورت را دقیق‌تر می‌گیرد.
    <div className="app-layout-shell flex min-h-[100dvh] h-[100dvh] bg-gray-100 dark:bg-gray-900 relative overflow-hidden" data-ui-shell="app-layout">
      {/* Sidebar: on small screens it slides in/out; on desktop it is always visible */}
      <Sidebar
        isOpen={isDesktop || isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      {/* Overlay for mobile when sidebar is open */}
      {!isDesktop && isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="app-sidebar-overlay fixed inset-0 bg-black/40 z-[60] md:hidden" data-ui-navigation-overlay="sidebar"
        />
      )}
      <div
        className="app-content-shell flex-1 flex flex-col transition-all duration-300 ease-in-out pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0 min-w-0" data-ui-shell="content"
        style={{ marginRight: contentMarginRight }}
      >
        <Header
          pageTitle={getCurrentPageTitle()}
          onToggleSidebar={() => setIsSidebarOpen(s => !s)}
          onOpenCommandPalette={() => setPaletteOpen(true)}
        />
        <main className="app-main-scroll flex-1 overflow-y-auto overflow-x-hidden bg-slate-50 dark:bg-slate-950 print:p-0 print:bg-white" data-ui-shell="main-scroll" style={{ padding: 'var(--app-page-gap)' }}>
          <Outlet />
        </main>
        <MobileBottomNav onMenuClick={() => setIsSidebarOpen(true)} />
        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      </div>
    </div>
  );
};

export default MainLayout;
