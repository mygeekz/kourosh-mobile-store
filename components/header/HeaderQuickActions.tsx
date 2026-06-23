import React, { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { Link } from 'react-router-dom';
import FontAwesomeIcon from '../ui/FontAwesomeIcon';
import { canAccessNavigationPath, type NavigationFeatureFlags } from '../../utils/navigationPolicy';
import type { CurrencyUnit } from '../../utils/currency';
import type { FontAwesomeIconClass } from '../../types/iconMetadata';
import type {
  HeaderFinancePulse,
  HeaderQuickMenuKey,
  HeaderQuickMenuSmartStyle,
  HeaderQuickPanels,
  HeaderQuickStats,
} from './headerTypes';

type HeaderQuickActionsProps = {
  roleName?: Parameters<typeof canAccessNavigationPath>[0];
  featureFlags: NavigationFeatureFlags;
  isFeatureEnabled: (featureKey: string) => boolean;
  headerQuickStats: HeaderQuickStats;
  headerQuickLoading: boolean;
  headerQuickPanels: HeaderQuickPanels;
  headerFinancePulse: HeaderFinancePulse;
  headerCurrencyUnit: CurrencyUnit;
  setHeaderCurrencyUnit: Dispatch<SetStateAction<CurrencyUnit>>;
  headerCurrencyLabel: string;
  formatMoney: (value: number | undefined | null) => string;
  formatMoneyPreview: (value: number | undefined | null) => string;
  refreshHeaderQuickPanels: () => void;
};

type HeaderQuickActionConfig = {
  key: HeaderQuickMenuKey;
  to: string;
  label: string;
  icon: FontAwesomeIconClass;
  count: number;
  badgeTone: string;
  surface: string;
  tooltip: string;
};

const getQuickActionAccent = (key: HeaderQuickMenuKey, count: number) => {
  const level = count >= (key === 'sales' ? 8 : key === 'due' ? 3 : 6) ? 'strong' : count > 0 ? 'soft' : 'none';

  const map = {
    sales: {
      none: { button: 'border-slate-200/85 bg-white text-slate-800 ring-slate-200/70 dark:border-slate-700/80 dark:bg-slate-950 dark:text-slate-100 dark:ring-slate-800/70', panel: 'border-slate-200/95 bg-white ring-slate-950/5 dark:border-slate-700/90 dark:bg-slate-950 dark:ring-white/5', row: 'border-slate-200/80 bg-white hover:border-sky-300 hover:bg-sky-50/60 dark:border-slate-700 dark:bg-slate-950/60 dark:hover:border-sky-400/30 dark:hover:bg-sky-950/10' },
      soft: { button: 'border-slate-200/85 bg-sky-50/65 text-slate-800 ring-sky-100/70 dark:border-slate-700/80 dark:bg-sky-950/18 dark:text-slate-100 dark:ring-sky-900/35', panel: 'border-sky-200/90 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_52%,#eef8ff_100%)] ring-sky-100/70 dark:border-sky-800/60 dark:bg-[linear-gradient(180deg,#020617_0%,#0b1220_58%,#082f49_100%)] dark:ring-sky-900/35', row: 'border-sky-200/80 bg-white/88 hover:border-sky-300/80 hover:bg-sky-50/85 dark:border-sky-900/40 dark:bg-slate-950/58 dark:hover:border-sky-500/35 dark:hover:bg-sky-950/28' },
      strong: { button: 'border-sky-200/90 bg-[linear-gradient(180deg,#ffffff_0%,#f0f9ff_100%)] text-slate-900 ring-sky-100/70 dark:border-sky-800/65 dark:bg-[linear-gradient(180deg,#082f49_0%,#0f172a_100%)] dark:text-sky-50 dark:ring-sky-900/45', panel: 'border-sky-300/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_44%,#eaf6ff_100%)] ring-sky-100/80 dark:border-sky-700/70 dark:bg-[linear-gradient(180deg,#020617_0%,#0b1220_45%,#082f49_100%)] dark:ring-sky-900/45', row: 'border-sky-300/75 bg-white/90 hover:border-sky-400/80 hover:bg-sky-50/95 dark:border-sky-800/50 dark:bg-slate-950/62 dark:hover:border-sky-400/40 dark:hover:bg-sky-950/32' },
    },
    due: {
      none: { button: 'border-slate-200/85 bg-white text-slate-800 ring-slate-200/70 dark:border-slate-700/80 dark:bg-slate-950 dark:text-slate-100 dark:ring-slate-800/70', panel: 'border-slate-200/95 bg-white ring-slate-950/5 dark:border-slate-700/90 dark:bg-slate-950 dark:ring-white/5', row: 'border-slate-200/80 bg-white hover:border-rose-300 hover:bg-rose-50/60 dark:border-slate-700 dark:bg-slate-950/60 dark:hover:border-rose-400/30 dark:hover:bg-rose-500/10' },
      soft: { button: 'border-slate-200/85 bg-rose-50/65 text-slate-800 ring-rose-100/70 dark:border-slate-700/80 dark:bg-rose-950/18 dark:text-slate-100 dark:ring-rose-900/35', panel: 'border-rose-200/90 bg-[linear-gradient(180deg,#ffffff_0%,#fffafa_52%,#fff1f2_100%)] ring-rose-100/70 dark:border-rose-800/60 dark:bg-[linear-gradient(180deg,#020617_0%,#0b1220_58%,#4c0519_100%)] dark:ring-rose-900/35', row: 'border-rose-200/80 bg-white/88 hover:border-rose-300/80 hover:bg-rose-50/85 dark:border-rose-900/40 dark:bg-slate-950/58 dark:hover:border-rose-500/35 dark:hover:bg-rose-950/28' },
      strong: { button: 'border-rose-200/90 bg-[linear-gradient(180deg,#ffffff_0%,#fff1f2_100%)] text-slate-900 ring-rose-100/70 dark:border-rose-800/65 dark:bg-[linear-gradient(180deg,#4c0519_0%,#0f172a_100%)] dark:text-rose-50 dark:ring-rose-900/45', panel: 'border-rose-300/80 bg-[linear-gradient(180deg,#ffffff_0%,#fffafa_44%,#fff1f2_100%)] ring-rose-100/80 dark:border-rose-700/70 dark:bg-[linear-gradient(180deg,#020617_0%,#0b1220_45%,#4c0519_100%)] dark:ring-rose-900/45', row: 'border-rose-300/75 bg-white/90 hover:border-rose-400/80 hover:bg-rose-50/95 dark:border-rose-800/50 dark:bg-slate-950/62 dark:hover:border-rose-400/40 dark:hover:bg-rose-950/32' },
    },
    notifications: {
      none: { button: 'border-slate-200/85 bg-white text-slate-800 ring-slate-200/70 dark:border-slate-700/80 dark:bg-slate-950 dark:text-slate-100 dark:ring-slate-800/70', panel: 'border-slate-200/95 bg-white ring-slate-950/5 dark:border-slate-700/90 dark:bg-slate-950 dark:ring-white/5', row: 'border-slate-200/80 bg-white hover:border-amber-300 hover:bg-amber-50/60 dark:border-slate-700 dark:bg-slate-950/60 dark:hover:border-amber-400/30 dark:hover:bg-amber-500/10' },
      soft: { button: 'border-amber-200/90 bg-[linear-gradient(180deg,#fffdf7_0%,#fffbeb_100%)] text-slate-900 ring-amber-100/70 dark:border-amber-800/55 dark:bg-[linear-gradient(180deg,#1f1708_0%,#0f172a_100%)] dark:text-amber-50 dark:ring-amber-900/35', panel: 'border-amber-200/90 bg-[linear-gradient(180deg,#ffffff_0%,#fffdf7_52%,#fffbeb_100%)] ring-amber-100/70 dark:border-amber-800/60 dark:bg-[linear-gradient(180deg,#020617_0%,#0b1220_58%,#451a03_100%)] dark:ring-amber-900/35', row: 'border-amber-200/80 bg-white/88 hover:border-amber-300/80 hover:bg-amber-50/85 dark:border-amber-900/40 dark:bg-slate-950/58 dark:hover:border-amber-500/35 dark:hover:bg-amber-950/28' },
      strong: { button: 'border-amber-300/90 bg-[linear-gradient(180deg,#ffffff_0%,#fff7d6_100%)] text-slate-950 ring-amber-200/70 dark:border-amber-700/70 dark:bg-[linear-gradient(180deg,#5b2a05_0%,#0f172a_100%)] dark:text-amber-50 dark:ring-amber-900/45', panel: 'border-amber-300/80 bg-[linear-gradient(180deg,#ffffff_0%,#fffdf7_44%,#fff7d6_100%)] ring-amber-100/80 dark:border-amber-700/70 dark:bg-[linear-gradient(180deg,#020617_0%,#0b1220_45%,#451a03_100%)] dark:ring-amber-900/45', row: 'border-amber-300/75 bg-white/90 hover:border-amber-400/80 hover:bg-amber-50/95 dark:border-amber-800/50 dark:bg-slate-950/62 dark:hover:border-amber-400/40 dark:hover:bg-amber-950/32' },
    },
  } as const;

  return map[key][level];
};

const HeaderQuickActions: React.FC<HeaderQuickActionsProps> = ({
  roleName,
  featureFlags,
  isFeatureEnabled,
  headerQuickStats,
  headerQuickLoading,
  headerQuickPanels,
  headerFinancePulse,
  headerCurrencyUnit,
  setHeaderCurrencyUnit,
  headerCurrencyLabel,
  formatMoney,
  formatMoneyPreview,
  refreshHeaderQuickPanels,
}) => {
  const quickActionsRef = useRef<HTMLDivElement>(null);
  const quickActionCloseTimer = useRef<number | null>(null);
  const [activeQuickMenu, setActiveQuickMenu] = useState<HeaderQuickMenuKey | null>(null);
  const quickMenuButtonRefs = useRef<Record<HeaderQuickMenuKey, HTMLDivElement | null>>({ sales: null, due: null, notifications: null });
  const [quickMenuPosition, setQuickMenuPosition] = useState<Record<HeaderQuickMenuKey, HeaderQuickMenuSmartStyle>>({
    sales: {},
    due: {},
    notifications: {},
  });

  const scheduleQuickMenuClose = () => {
    if (quickActionCloseTimer.current) window.clearTimeout(quickActionCloseTimer.current);
    quickActionCloseTimer.current = window.setTimeout(() => setActiveQuickMenu(null), 160);
  };

  const cancelQuickMenuClose = () => {
    if (quickActionCloseTimer.current) {
      window.clearTimeout(quickActionCloseTimer.current);
      quickActionCloseTimer.current = null;
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (quickActionsRef.current && !quickActionsRef.current.contains(event.target as Node)) {
        setActiveQuickMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (activeQuickMenu === 'due' || activeQuickMenu === 'notifications') {
      refreshHeaderQuickPanels();
    }
  }, [activeQuickMenu, refreshHeaderQuickPanels]);

  useEffect(() => () => {
    if (quickActionCloseTimer.current) {
      window.clearTimeout(quickActionCloseTimer.current);
    }
  }, []);

  useEffect(() => {
    const updateQuickMenuPositions = () => {
      if (typeof window === 'undefined') return;
      const viewportPadding = 14;
      const panelWidth = Math.min(340, Math.max(292, window.innerWidth - viewportPadding * 2));
      const gap = 10;
      const next: Record<HeaderQuickMenuKey, HeaderQuickMenuSmartStyle> = {
        sales: {},
        due: {},
        notifications: {},
      };

      (['sales', 'due', 'notifications'] as const).forEach((key) => {
        const node = quickMenuButtonRefs.current[key];
        if (!node) return;

        const rect = node.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
        const spaceAbove = rect.top - viewportPadding;
        const preferredHeight = key === 'sales' ? 540 : 460;
        const openBelow = spaceBelow >= 260 || spaceBelow >= spaceAbove;
        const maxHeight = Math.max(240, Math.min(preferredHeight, (openBelow ? spaceBelow : spaceAbove) - gap));
        const top = openBelow
          ? Math.min(rect.bottom + gap, window.innerHeight - viewportPadding - maxHeight)
          : Math.max(viewportPadding, rect.top - gap - maxHeight);

        const centeredLeft = rect.left + rect.width / 2 - panelWidth / 2;
        const safeLeft = Math.min(
          Math.max(viewportPadding, centeredLeft),
          Math.max(viewportPadding, window.innerWidth - viewportPadding - panelWidth),
        );

        next[key] = {
          position: 'fixed',
          top: Math.round(top),
          left: Math.round(safeLeft),
          right: 'auto',
          width: panelWidth,
          maxHeight: Math.round(maxHeight),
          overflowY: 'auto',
          transformOrigin: `${Math.round(rect.left + rect.width / 2 - safeLeft)}px ${openBelow ? '0px' : '100%'}`,
          '--header-quick-panel-origin-x': `${Math.round(rect.left + rect.width / 2 - safeLeft)}px`,
          '--header-quick-panel-origin-y': openBelow ? '0px' : '100%',
        };
      });

      setQuickMenuPosition(next);
    };

    updateQuickMenuPositions();
    window.addEventListener('resize', updateQuickMenuPositions);
    window.addEventListener('scroll', updateQuickMenuPositions, true);
    return () => {
      window.removeEventListener('resize', updateQuickMenuPositions);
      window.removeEventListener('scroll', updateQuickMenuPositions, true);
    };
  }, [activeQuickMenu, headerQuickLoading, headerQuickStats.salesCount, headerQuickStats.dueCount, headerQuickStats.notificationsCount]);

  const headerQuickActionsRaw: HeaderQuickActionConfig[] = [
    {
      key: 'sales',
      to: '/reports',
      label: 'فروش امروز',
      icon: 'fa-solid fa-bag-shopping',
      count: headerQuickStats.salesCount,
      badgeTone: 'bg-sky-500 text-white',
      surface: 'border-slate-200/90 text-slate-800 hover:border-sky-300/60 hover:text-slate-900 dark:border-slate-700/80 dark:text-slate-100 dark:hover:border-sky-500/35 dark:hover:text-white',
      tooltip: 'ورود به گزارش‌های فروش امروز',
    },
    {
      key: 'due',
      to: '/reports/installments-calendar',
      label: 'سررسیدها',
      icon: 'fa-solid fa-hourglass-half',
      count: headerQuickStats.dueCount,
      badgeTone: 'bg-rose-500 text-white',
      surface: 'border-slate-200/90 text-slate-800 hover:border-rose-300/60 hover:text-slate-900 dark:border-slate-700/80 dark:text-slate-100 dark:hover:border-rose-500/35 dark:hover:text-white',
      tooltip: 'ورود به تقویم سررسیدها و اقساط',
    },
    {
      key: 'notifications',
      to: '/notifications',
      label: 'اعلان‌ها',
      icon: 'fa-solid fa-bell',
      count: headerQuickStats.notificationsCount,
      badgeTone: 'bg-amber-500 text-slate-950',
      surface: 'border-amber-200/90 text-slate-900 hover:border-amber-300/80 hover:text-slate-950 dark:border-amber-800/60 dark:text-amber-50 dark:hover:border-amber-500/45 dark:hover:text-white',
      tooltip: 'ورود به مرکز اعلان‌ها',
    },
  ];

  const headerQuickActions = headerQuickActionsRaw.filter((action) => {
    if (!canAccessNavigationPath(roleName, featureFlags, action.to)) return false;
    if (action.key === 'sales') return isFeatureEnabled('cash_sales');
    if (action.key === 'due') return isFeatureEnabled('installments');
    if (action.key === 'notifications') return isFeatureEnabled('notifications_outbox');
    return true;
  });

  const quickActionSummaries = {
    sales: {
      title: 'پیش‌نمایش فروش امروز',
      subtitle: headerQuickPanels.sales.totalTransactions > 0
        ? `${headerQuickPanels.sales.totalTransactions.toLocaleString('fa-IR')} فاکتور ثبت اطلاعات شده`
        : 'امروز هنوز فروشی ثبت اطلاعات نشده است',
    },
    due: {
      title: 'سررسیدهای نزدیک',
      subtitle: headerQuickPanels.due.length > 0 ? 'سه مورد اول برای اقدام سریع' : 'موردی برای نمایش وجود ندارد',
    },
    notifications: {
      title: 'اعلان‌های اخیر',
      subtitle: headerQuickPanels.notifications.length > 0 ? 'سه اعلان آخر مرکز اعلان‌ها' : 'اعلانی برای نمایش وجود ندارد',
    },
  } as const;

  const renderQuickActionMenu = (key: HeaderQuickMenuKey) => {
    if (headerQuickLoading) {
      return (
        <div className="grid gap-2 p-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="h-12 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800/70" />
          ))}
        </div>
      );
    }

    if (key === 'sales') {
      return (
        <div className="space-y-3 p-3">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/85 bg-slate-50/80 px-3 py-2 dark:border-slate-700/80 dark:bg-slate-900/60">
            <div>
              <div className="text-[11px] font-black text-slate-800 dark:text-slate-100">واحد نمایش مبلغ</div>
              <div className="mt-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">می‌توانی بین تومان و ریال جابه‌جا شوی.</div>
            </div>
            <div className="inline-flex items-center rounded-full border border-slate-200 bg-white/92 p-1 shadow-sm dark:border-slate-700 dark:bg-slate-950/80">
              {([
                { key: 'toman', label: 'تومان' },
                { key: 'rial', label: 'ریال' },
              ] as const).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setHeaderCurrencyUnit(item.key)}
                  className={[
                    'inline-flex h-8 items-center rounded-full px-3 text-[11px] font-black transition',
                    headerCurrencyUnit === item.key
                      ? 'bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900'
                      : 'text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900',
                  ].join(' ')}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className={[
              'header-finance-pulse-tile rounded-2xl border px-3 py-2',
              getQuickActionAccent('sales', headerQuickStats.salesCount).row,
            ].join(' ')}>
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">فروش امروز</div>
              <div className="mt-1 text-sm font-black text-slate-900 dark:text-white">{formatMoney(headerQuickPanels.sales.totalRevenue)}</div>
            </div>
            <div className={[
              'header-finance-pulse-tile rounded-2xl border px-3 py-2',
              getQuickActionAccent('sales', headerQuickStats.salesCount).row,
            ].join(' ')}>
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">میانگین فاکتور</div>
              <div className="mt-1 text-sm font-black text-slate-900 dark:text-white">{formatMoney(headerQuickPanels.sales.averageSaleValue)}</div>
            </div>
          </div>
          {isFeatureEnabled('advanced_reports') ? (
            <div className="header-finance-pulse-mini rounded-2xl border border-slate-200/90 bg-white/88 px-3 py-2.5 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.22)] dark:border-slate-700/80 dark:bg-slate-950/72">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 text-[11px] font-black text-slate-700 dark:text-slate-200">
                  <FontAwesomeIcon icon="fa-solid fa-chart-simple" className="text-sky-600 dark:text-sky-300" /> نبض مالی ماه
                </div>
                <Link
                  to="/reports/financial-overview"
                  onClick={() => setActiveQuickMenu(null)}
                  className="text-[10px] font-black text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                >
                  نمای کلی مالی
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-2 py-2 dark:border-slate-700 dark:bg-slate-900/62">
                  <div className="text-[9px] font-bold text-slate-500 dark:text-slate-400">سود تحقق‌یافته</div>
                  <div className="mt-1 text-slate-900 dark:text-white" title={formatMoney(headerFinancePulse.realizedProfit)}>
                    <div className="truncate text-[11px] font-black leading-5">{formatMoneyPreview(headerFinancePulse.realizedProfit)}</div>
                    <div className="mt-0.5 text-[8px] font-bold text-slate-500 dark:text-slate-400">{headerCurrencyLabel}</div>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-2 py-2 dark:border-slate-700 dark:bg-slate-900/62">
                  <div className="text-[9px] font-bold text-slate-500 dark:text-slate-400">نرخ وصول</div>
                  <div className="mt-1 text-[11px] font-black text-violet-700 dark:text-violet-300">{`${Math.round(Number(headerFinancePulse.collectionRate || 0)).toLocaleString('fa-IR')}٪`}</div>
                </div>
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-2 py-2 dark:border-slate-700 dark:bg-slate-900/62">
                  <div className="text-[9px] font-bold text-slate-500 dark:text-slate-400">وصول واقعی</div>
                  <div className="mt-1 text-emerald-700 dark:text-emerald-300" title={formatMoney(headerFinancePulse.realizedRevenue)}>
                    <div className="truncate text-[11px] font-black leading-5">{formatMoneyPreview(headerFinancePulse.realizedRevenue)}</div>
                    <div className="mt-0.5 text-[8px] font-bold text-emerald-600/80 dark:text-emerald-300/80">{headerCurrencyLabel}</div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
          <div className={[
            'rounded-2xl border px-3 py-3',
            getQuickActionAccent('sales', headerQuickStats.salesCount).row,
          ].join(' ')}>
            <div className="mb-2 text-[11px] font-black text-slate-700 dark:text-slate-200">پرفروش‌ترین‌های امروز</div>
            <div className="space-y-2">
              {headerQuickPanels.sales.topSellingItems.length ? headerQuickPanels.sales.topSellingItems.map((item, idx) => (
                <div key={`${item.itemName || 'item'}-${idx}`} className={[
                  'flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-right transition',
                  getQuickActionAccent('sales', headerQuickStats.salesCount).row,
                ].join(' ')}>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-bold text-slate-800 dark:text-slate-100">{item.itemName || 'آیتم بدون عنوان'}</div>
                    <div className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">{Number(item.quantitySold || 0).toLocaleString('fa-IR')} فروش</div>
                  </div>
                  <div className="shrink-0 text-[11px] font-black text-sky-700 dark:text-sky-300">{formatMoney(item.totalRevenue)}</div>
                </div>
              )) : <div className="rounded-xl bg-slate-50 px-3 py-3 text-xs text-slate-500 dark:bg-slate-950/56 dark:text-slate-300">برای امروز هنوز آیتم فروخته‌شده‌ای ثبت اطلاعات نشده است.</div>}
            </div>
          </div>
        </div>
      );
    }

    if (key === 'due') {
      return (
        <div className="space-y-2 p-3">
          {headerQuickPanels.due.length ? headerQuickPanels.due.map((item, idx) => (
            <Link
              key={`${item.saleId || 'due'}-${idx}`}
              to={item.saleId ? `/installment-sales/${item.saleId}` : '/reports/installments-calendar'}
              className={[
                'flex items-start justify-between gap-3 rounded-2xl border px-3 py-2.5 text-right transition',
                getQuickActionAccent('due', headerQuickStats.dueCount).row,
              ].join(' ')}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-black text-slate-800 dark:text-slate-100">{item.customerFullName || 'مشتری بدون نام'}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                  <span>{item.dueDate || 'بدون تاریخ'}</span>
                  <span className="rounded-full bg-rose-50 px-2 py-0.5 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{item.status || 'pending'}</span>
                </div>
              </div>
              <div className="shrink-0 text-[11px] font-black text-rose-700 dark:text-rose-300">{formatMoney(item.amount)}</div>
            </Link>
          )) : <div className="rounded-2xl bg-slate-50 px-3 py-3 text-xs text-slate-500 dark:bg-slate-950/56 dark:text-slate-300">در حال حاضر سررسید بازی برای نمایش وجود ندارد.</div>}
        </div>
      );
    }

    return (
      <div className="space-y-2 p-3">
        {headerQuickPanels.notifications.length ? headerQuickPanels.notifications.map((item) => (
          <Link
            key={item.id}
            to={item.actionLink || '/notifications'}
            className={[
              'block rounded-2xl border px-3 py-2.5 text-right transition',
              getQuickActionAccent('notifications', headerQuickStats.notificationsCount).row,
            ].join(' ')}
          >
            <div className="text-xs font-black text-slate-900 dark:text-amber-50">{item.title || 'اعلان'}</div>
            <div className="mt-1 line-clamp-2 text-[11px] leading-5 text-slate-600 dark:text-slate-300">{item.description || 'برای مشاهده جزئیات وارد مرکز اعلان‌ها شوید.'}</div>
          </Link>
        )) : <div className="rounded-2xl bg-slate-50 px-3 py-3 text-xs text-slate-500 dark:bg-slate-950/56 dark:text-slate-300">اعلان مهمی برای نمایش وجود ندارد.</div>}
      </div>
    );
  };

  return (
    <div ref={quickActionsRef} className="hidden xl:flex items-center gap-2">
      {headerQuickActions.map((action) => {
        const isOpen = activeQuickMenu === action.key;
        const accent = getQuickActionAccent(action.key, action.count);
        return (
          <div
            key={action.key}
            ref={(node) => { quickMenuButtonRefs.current[action.key] = node; }}
            className="relative"
            data-ui-header-quick-action={action.key}
            data-header-alert-active={action.count > 0 ? 'true' : 'false'}
            onMouseEnter={() => {
              cancelQuickMenuClose();
              setActiveQuickMenu(action.key);
            }}
            onMouseLeave={scheduleQuickMenuClose}
          >
            <button
              type="button"
              data-skip-global-button="true"
              data-no-tooltip="true"
              aria-expanded={isOpen}
              data-quick-role="live-preview"
              data-ui-notification-beacon={action.key === 'notifications' ? 'true' : undefined}
              data-header-alert-count={action.count}
              className={[
                'group relative inline-flex h-10 min-w-[124px] items-center justify-between gap-2 rounded-[16px] border px-3 py-1.5 text-[11px] font-black transition-all duration-200',
                'shadow-[0_10px_24px_-20px_rgba(15,23,42,0.18)] ring-1 backdrop-blur-0',
                'before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:bg-[linear-gradient(135deg,rgba(255,255,255,0.12),rgba(255,255,255,0.02))] before:opacity-55 before:transition-opacity dark:before:bg-[linear-gradient(135deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))]',
                'hover:-translate-y-[1px] hover:shadow-[0_14px_28px_-22px_rgba(15,23,42,0.24)]',
                '   ',
                isOpen ? 'shadow-[0_16px_34px_-24px_rgba(15,23,42,0.26)]' : '',
                accent.button,
                action.surface,
              ].join(' ')}
              onClick={() => setActiveQuickMenu(isOpen ? null : action.key)}
              title={action.tooltip}
            >
              <span className="relative z-[1] inline-flex min-w-0 flex-1 items-center gap-2.5">
                <span className="block whitespace-nowrap leading-none text-[11px]">{action.label}</span>
                <span className="relative inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[13px] border border-white/80 bg-white/90 text-[11px] text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_16px_-14px_rgba(15,23,42,0.24)] ring-1 ring-white/55 dark:border-white/10 dark:bg-slate-900/88 dark:text-slate-100 dark:ring-white/5">
                  <FontAwesomeIcon icon={action.icon} />
                  {!headerQuickLoading && action.count > 0 ? (
                    <span className={[
                      'absolute -left-1 -top-1 inline-flex items-center justify-center rounded-full text-[9px] font-black leading-none shadow-[0_8px_14px_-10px_rgba(15,23,42,0.38)]',
                      action.count > 9 ? 'h-[18px] min-w-[18px] px-1.5' : 'h-[18px] w-[18px]',
                      action.badgeTone,
                    ].join(' ')}>
                      {(action.count > 9 ? '9+' : action.count.toLocaleString('fa-IR'))}
                    </span>
                  ) : null}
                </span>
              </span>
              <FontAwesomeIcon
                icon="fa-solid fa-angle-down"
                className={['relative z-[1] text-[9px] opacity-55 transition duration-200', isOpen ? 'rotate-180 opacity-100' : 'group-hover:translate-y-0.5 group-hover:opacity-100'].join(' ')}
              />
            </button>

            <div
              data-ui-header-quick-panel={action.key}
              data-state={isOpen ? 'open' : 'closed'}
              className={[
                'header-smart-popover fixed z-[9000] overflow-hidden rounded-[28px] border shadow-[0_34px_88px_-42px_rgba(15,23,42,0.34),0_18px_36px_-26px_rgba(15,23,42,0.20)] ring-1 transition-all duration-200 dark:shadow-[0_38px_96px_-44px_rgba(2,6,23,0.80),0_18px_36px_-26px_rgba(2,6,23,0.54)]',
                isOpen ? 'header-smart-popover--open pointer-events-auto scale-100 translate-y-0 opacity-100' : 'header-smart-popover--closed pointer-events-none scale-[0.985] -translate-y-1 opacity-0',
                accent.panel,
              ].join(' ')}
              style={quickMenuPosition[action.key]}
              onMouseEnter={cancelQuickMenuClose}
              onMouseLeave={scheduleQuickMenuClose}
            >
              <span className="header-smart-popover__arrow" aria-hidden="true" />
              <span className="header-smart-popover__aura" aria-hidden="true" />
              <div className="relative z-[1] border-b border-white/70 bg-white/76 px-4 py-3 text-right backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-950/52">
                <div className="flex items-center justify-between gap-3"><div className="text-sm font-black text-slate-900 dark:text-white">{quickActionSummaries[action.key].title}</div><span className="header-quick-role-pill border border-slate-200/80 bg-white/82 text-slate-600 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300">پیش‌نمایش</span></div>
                <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{quickActionSummaries[action.key].subtitle}</div>
              </div>
              <div className="relative z-[1]">{renderQuickActionMenu(action.key)}</div>
              <div className="relative z-[1] flex items-center justify-between gap-3 border-t border-white/70 bg-white/72 px-4 py-3 backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-950/50">
                <button
                  type="button"
                  onClick={() => setActiveQuickMenu(null)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
                >
                  <FontAwesomeIcon icon="fa-solid fa-xmark" className="text-[10px]" /> بستن
                </button>
                <Link
                  to={action.to}
                  onClick={() => setActiveQuickMenu(null)}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-black text-white shadow-[0_16px_30px_-22px_rgba(15,23,42,0.34)] transition hover:bg-slate-800 hover:shadow-[0_20px_34px_-24px_rgba(15,23,42,0.32)] dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  مشاهده کامل <FontAwesomeIcon icon="fa-solid fa-arrow-up-from-bracket" className="text-[10px]" />
                </Link>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default HeaderQuickActions;
