// components/Header.tsx
import React, { useState, useEffect, useRef, FormEvent, useMemo, useCallback, type CSSProperties } from 'react';
import moment from 'jalali-moment';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useStyle } from '../contexts/StyleContext';
import { processQuery } from '../utils/search/processQuery';
import { buildRelatedSuggestions, getPopularSearches, getRecentSearches, recordSearch } from '../utils/searchInsights';
import { useFavorites } from '../contexts/FavoritesContext';
import { findNavByPath, normalizePath } from '../utils/nav';
import { SIDEBAR_ITEMS } from '../constants';
import { canAccessPath } from '../utils/rbac';
import { apiFetch } from '../utils/apiFetch';
import { useFeatureFlags } from '../contexts/FeatureFlagsContext';
import { formatCurrencyText, getCurrencyUnitLabel, readStoredCurrencyUnit, writeStoredCurrencyUnit, type CurrencyUnit } from '../utils/currency';


type HeaderSearchDomain = 'customer' | 'partner' | 'product' | 'phone' | 'service' | 'invoice' | 'repair' | 'installment';
type HeaderSearchItem = {
  id: number;
  domain: HeaderSearchDomain;
  title?: string;
  subtitle?: string;
  titleHL?: string;
  snippet?: string;
  matchSource?: string;
  matchReason?: string;
};

type HeaderNotificationItem = {
  id: string;
  title?: string;
  description?: string;
  actionLink?: string;
};

type HeaderDueItem = {
  saleId?: number;
  dueDate?: string;
  amount?: number;
  customerFullName?: string;
  status?: string;
};


type HeaderQuickMenuSmartStyle = CSSProperties & {
  '--header-quick-panel-origin-x'?: string;
  '--header-quick-panel-origin-y'?: string;
};

type HeaderSalesPreview = {
  totalRevenue: number;
  grossProfit: number;
  totalTransactions: number;
  averageSaleValue: number;
  topSellingItems: Array<{ itemName?: string; totalRevenue?: number; quantitySold?: number }>;
};

type HeaderFinancePulse = {
  realizedProfit: number;
  realizedRevenue: number;
  unrecognizedProfit: number;
  collectionRate: number;
};

const headerDomainMeta = (domain: HeaderSearchDomain) => {
  switch (domain) {
    case 'customer': return { label: 'مشتری', icon: 'fa-solid fa-user', accent: 'text-sky-700 bg-sky-50 border-sky-100' };
    case 'partner': return { label: 'همکار', icon: 'fa-solid fa-user-tie', accent: 'text-violet-700 bg-violet-50 border-violet-100' };
    case 'product': return { label: 'کالا', icon: 'fa-solid fa-box', accent: 'text-emerald-700 bg-emerald-50 border-emerald-100' };
    case 'phone': return { label: 'گوشی', icon: 'fa-solid fa-mobile-screen-button', accent: 'text-cyan-700 bg-cyan-50 border-cyan-100' };
    case 'service': return { label: 'خدمت', icon: 'fa-solid fa-wand-magic-sparkles', accent: 'text-fuchsia-700 bg-fuchsia-50 border-fuchsia-100' };
    case 'invoice': return { label: 'فروش', icon: 'fa-solid fa-file-invoice-dollar', accent: 'text-amber-700 bg-amber-50 border-amber-100' };
    case 'repair': return { label: 'تعمیر', icon: 'fa-solid fa-screwdriver-wrench', accent: 'text-rose-700 bg-rose-50 border-rose-100' };
    case 'installment': return { label: 'اقساط', icon: 'fa-solid fa-credit-card', accent: 'text-indigo-700 bg-indigo-50 border-indigo-100' };
    default: return { label: 'نتیجه', icon: 'fa-solid fa-magnifying-glass', accent: 'text-gray-700 bg-gray-50 border-gray-100' };
  }
};

const resolveHeaderSearchPath = (item: HeaderSearchItem, term: string) => {
  switch (item.domain) {
    case 'customer': return `/customers/${item.id}`;
    case 'partner': return `/partners/${item.id}`;
    case 'invoice': return `/invoices/${item.id}`;
    case 'repair': return `/repairs/${item.id}`;
    case 'installment': return `/installment-sales/${item.id}`;
    case 'product': return `/products?search=${encodeURIComponent(term)}`;
    case 'phone': return `/mobile-phones?q=${encodeURIComponent(term)}`;
    case 'service': return `/services?q=${encodeURIComponent(term)}`;
    default: return `/products?search=${encodeURIComponent(term)}`;
  }
};

interface HeaderProps {
  pageTitle: string;
  onOpenCommandPalette?: () => void;
  /**
   * Called when the mobile sidebar toggle (hamburger) is clicked.
   * Optional because Header can be used on pages without a sidebar (e.g. login).
   */
  onToggleSidebar?: () => void;
}

const Header: React.FC<HeaderProps> = ({ pageTitle, onToggleSidebar, onOpenCommandPalette }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const recentSearches = useMemo(() => getRecentSearches(), [searchFocused, searchQuery]);
  const popularSearches = useMemo(() => getPopularSearches(), [searchFocused, searchQuery]);
  const relatedSearches = useMemo(() => {
    const pool = [
      ...recentSearches.map((item) => item.query),
      ...popularSearches.map((item) => item.query),
      suggestion || '',
      'کاور', 'گلس', 'باتری', 'شارژر', 'اقساط', 'تعمیرات', 'مشتری', 'همکار',
    ];
    return buildRelatedSuggestions(searchQuery, pool, 6);
  }, [recentSearches, popularSearches, searchQuery, suggestion]);

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const quickActionsRef = useRef<HTMLDivElement>(null);
  const quickActionCloseTimer = useRef<number | null>(null);
  const [activeQuickMenu, setActiveQuickMenu] = useState<'sales' | 'due' | 'notifications' | null>(null);
  const quickMenuButtonRefs = useRef<Record<'sales' | 'due' | 'notifications', HTMLDivElement | null>>({ sales: null, due: null, notifications: null });
  const [quickMenuPosition, setQuickMenuPosition] = useState<Record<'sales' | 'due' | 'notifications', HeaderQuickMenuSmartStyle>>({
    sales: {},
    due: {},
    notifications: {},
  });

  const navigate = useNavigate();
  const location = useLocation();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { currentUser, token, logout, isLoading: authProcessLoading, authReady } = useAuth();
  const { isEnabled: isFeatureEnabled } = useFeatureFlags();

  // صفحه فعلی برای علاقه‌مندی‌ها
  const currentPath = normalizePath(location.pathname);
  const currentNav = findNavByPath(SIDEBAR_ITEMS, currentPath);
  const canFavorite = Boolean(currentNav?.path) && currentNav!.path !== '/login' && canAccessPath(currentUser?.roleName, currentNav!.path!);

  // ← StyleContext برای تغییر تم
  const { style, setStyle } = useStyle();

  const toggleProfileMenu = () => setIsProfileMenuOpen(s => !s);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
      if (quickActionsRef.current && !quickActionsRef.current.contains(event.target as Node)) {
        setActiveQuickMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [globalResults, setGlobalResults] = useState<HeaderSearchItem[]>([]);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  const stashPaletteQuery = (value: string) => { try { localStorage.setItem('commandPaletteInitialQuery', value); } catch {} };

  const openGlobalResult = (item: HeaderSearchItem, rawValue?: string) => {
    const processedQuery = processQuery(rawValue ?? searchQuery);
    const q = processedQuery.final || processedQuery.normalized || '';
    if (q) recordSearch(q);
    navigate(resolveHeaderSearchPath(item, q || item.title || ''));
    setSearchFocused(false);
  };

  const openSearchResultsPage = (rawValue: string = searchQuery) => {
    const processedQuery = processQuery(rawValue);
    const q = (processedQuery.final || processedQuery.normalized || '').trim();
    if (!q) return;
    setSearchQuery(q);
    setSuggestion(processedQuery.suggestion ?? null);
    recordSearch(q);
    setSearchFocused(false);
    navigate({ pathname: '/search', search: `?q=${encodeURIComponent(q)}` });
  };

  const runGlobalSearch = (rawValue: string) => {
    openSearchResultsPage(rawValue);
  };

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    runGlobalSearch(searchQuery);
  };

  useEffect(() => {
    if (!searchFocused) return;
    const processed = processQuery(searchQuery);
    const q = (processed.final || processed.normalized || '').trim();
    if (!q || q.length < 2 || !token) {
      setGlobalResults([]);
      setGlobalLoading(false);
      setGlobalError(null);
      searchAbortRef.current?.abort();
      searchAbortRef.current = null;
      return;
    }

    const controller = new AbortController();
    searchAbortRef.current?.abort();
    searchAbortRef.current = controller;
    setGlobalLoading(true);
    setGlobalError(null);

    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=8`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload?.message || 'جستجوی سراسری انجام نشد');
        setGlobalResults(Array.isArray(payload?.items) ? payload.items : []);
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        setGlobalError(err?.message || 'خطا در جستجوی سراسری');
        setGlobalResults([]);
      } finally {
        setGlobalLoading(false);
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery, searchFocused, token]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // سوییچر تم: light → dark → system
  const cycleTheme = () => {
    const order: Array<typeof style.theme> = ['light', 'dark', 'system'];
    const next = order[(order.indexOf(style.theme) + 1) % order.length];
    setStyle('theme', next);
  };

  const ThemeIcon = () => {
    if (style.theme === 'light') return <i className="fa-regular fa-sun" />;
    if (style.theme === 'dark') return <i className="fa-regular fa-moon" />;
    return <i className="fa-solid fa-laptop" />;
  };


  const toPersianShamsi = () => moment().locale('fa').format('jYYYY/jMM/jDD');

  const [headerCurrencyUnit, setHeaderCurrencyUnit] = useState<CurrencyUnit>(() => readStoredCurrencyUnit());

  useEffect(() => {
    writeStoredCurrencyUnit(headerCurrencyUnit);
  }, [headerCurrencyUnit]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sync = (event: Event) => {
      const detail = (event as CustomEvent<CurrencyUnit>).detail;
      setHeaderCurrencyUnit(readStoredCurrencyUnit() || detail || 'toman');
    };
    window.addEventListener('kourosh:currency-unit-updated', sync as EventListener);
    return () => window.removeEventListener('kourosh:currency-unit-updated', sync as EventListener);
  }, []);

  const headerCurrencyLabel = getCurrencyUnitLabel(headerCurrencyUnit);
  const formatMoney = (value: number | undefined | null) => formatCurrencyText(value || 0, headerCurrencyUnit);
  const formatMoneyPreview = (value: number | undefined | null) => formatCurrencyText(value || 0, headerCurrencyUnit).replace(new RegExp(`\s*${headerCurrencyLabel}$`), '');

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

  const [headerQuickStats, setHeaderQuickStats] = useState({
    salesCount: 0,
    notificationsCount: 0,
    dueCount: 0,
  });
  const [headerRiskyCustomers, setHeaderRiskyCustomers] = useState({
    totalRisky: 0,
    lowScore: 0,
    lateOrOverdue: 0,
    returnedChecks: 0,
  });
  const [headerQuickRefreshKey, setHeaderQuickRefreshKey] = useState(0);
  const [headerQuickLoading, setHeaderQuickLoading] = useState(false);
  const [headerFinancePulse, setHeaderFinancePulse] = useState<HeaderFinancePulse>({
    realizedProfit: 0,
    realizedRevenue: 0,
    unrecognizedProfit: 0,
    collectionRate: 0,
  });
  const [headerQuickPanels, setHeaderQuickPanels] = useState<{
    sales: HeaderSalesPreview;
    notifications: HeaderNotificationItem[];
    due: HeaderDueItem[];
  }>({
    sales: {
      totalRevenue: 0,
      grossProfit: 0,
      totalTransactions: 0,
      averageSaleValue: 0,
      topSellingItems: [],
    },
    notifications: [],
    due: [],
  });

  const headerRiskLevel =
    headerRiskyCustomers.totalRisky >= 8 || headerRiskyCustomers.returnedChecks >= 2 ? 'critical'
      : headerRiskyCustomers.totalRisky >= 5 || headerRiskyCustomers.lateOrOverdue >= 3 ? 'high'
        : headerRiskyCustomers.totalRisky > 0 ? 'watch'
          : 'clear';

  const headerRiskLevelLabel =
    headerRiskLevel === 'critical' ? 'بحرانی'
      : headerRiskLevel === 'high' ? 'بالا'
        : headerRiskLevel === 'watch' ? 'قابل پیگیری'
          : 'سالم';

  const headerRiskLevelClass =
    headerRiskLevel === 'critical'
      ? 'border-rose-300/90 bg-rose-50 text-rose-800 ring-rose-100 dark:border-rose-800/70 dark:bg-rose-950/30 dark:text-rose-100 dark:ring-rose-900/35 animate-pulse'
      : headerRiskLevel === 'high'
        ? 'border-amber-300/90 bg-amber-50 text-amber-800 ring-amber-100 dark:border-amber-800/70 dark:bg-amber-950/25 dark:text-amber-100 dark:ring-amber-900/35'
        : headerRiskLevel === 'watch'
          ? 'border-orange-200/90 bg-orange-50 text-orange-800 ring-orange-100 dark:border-orange-800/60 dark:bg-orange-950/22 dark:text-orange-100 dark:ring-orange-900/30'
          : 'border-slate-200/85 bg-white text-slate-700 ring-slate-200/70 dark:border-slate-700/80 dark:bg-slate-950 dark:text-slate-100 dark:ring-slate-800/70';

  const headerRiskBadgeClass =
    headerRiskLevel === 'critical'
      ? 'bg-rose-600 text-white'
      : headerRiskLevel === 'high'
        ? 'bg-amber-500 text-slate-950'
        : headerRiskLevel === 'watch'
          ? 'bg-orange-500 text-white'
          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300';

  useEffect(() => {
    if (!authReady || !token || !currentUser) return;
    let alive = true;

    const loadHeaderQuickStats = async () => {
      setHeaderQuickLoading(true);
      try {
        const todayJ = toPersianShamsi();
        const monthMoment = moment().locale('fa');
        const monthFrom = monthMoment.clone().startOf('jMonth').format('jYYYY/jMM/jDD');
        const monthTo = monthMoment.clone().endOf('jMonth').format('jYYYY/jMM/jDD');
        const [salesRes, notificationsRes, calendarRes, financeRes] = await Promise.allSettled([
          isFeatureEnabled('cash_sales') ? apiFetch(`/api/reports/sales-summary?fromDate=${encodeURIComponent(todayJ)}&toDate=${encodeURIComponent(todayJ)}`) : Promise.resolve(null as any),
          isFeatureEnabled('notifications_outbox') ? apiFetch('/api/notifications') : Promise.resolve(null as any),
          isFeatureEnabled('installments') ? apiFetch('/api/reports/installments-calendar') : Promise.resolve(null as any),
          isFeatureEnabled('advanced_reports') ? apiFetch(`/api/reports/financial-overview?from=${encodeURIComponent(monthFrom)}&to=${encodeURIComponent(monthTo)}`) : Promise.resolve(null as any),
        ]);

        let salesCount = 0;
        let salesPreview: HeaderSalesPreview = {
          totalRevenue: 0,
          grossProfit: 0,
          totalTransactions: 0,
          averageSaleValue: 0,
          topSellingItems: [],
        };
        if (isFeatureEnabled('cash_sales') && salesRes.status === 'fulfilled' && salesRes.value?.ok) {
          const js = await salesRes.value.json().catch(() => ({} as any));
          salesCount = Number(js?.data?.totalTransactions || 0);
          salesPreview = {
            totalRevenue: Number(js?.data?.totalRevenue || 0),
            grossProfit: Number(js?.data?.grossProfit || 0),
            totalTransactions: Number(js?.data?.totalTransactions || 0),
            averageSaleValue: Number(js?.data?.averageSaleValue || 0),
            topSellingItems: Array.isArray(js?.data?.topSellingItems) ? js.data.topSellingItems.slice(0, 3) : [],
          };
        }

        let notificationsCount = 0;
        let notificationItems: HeaderNotificationItem[] = [];
        if (isFeatureEnabled('notifications_outbox') && notificationsRes.status === 'fulfilled' && notificationsRes.value?.ok) {
          const js = await notificationsRes.value.json().catch(() => ({} as any));
          const items = Array.isArray(js?.data) ? js.data : [];
          notificationsCount = items.length;
          notificationItems = items.slice(0, 3).map((item: any, index: number) => ({
            id: String(item?.id || `${item?.type || 'notification'}-${item?.actionLink || index}`),
            title: String(item?.title || 'اعلان بدون عنوان'),
            description: String(item?.description || ''),
            actionLink: typeof item?.actionLink === 'string' ? item.actionLink : undefined,
          }));
        }

        let dueCount = 0;
        let dueItems: HeaderDueItem[] = [];
        if (isFeatureEnabled('installments') && calendarRes.status === 'fulfilled' && calendarRes.value?.ok) {
          const js = await calendarRes.value.json().catch(() => ({} as any));
          const rawItems = Array.isArray(js?.data?.items) ? js.data.items : (Array.isArray(js?.data) ? js.data : []);
          const actionableDueItems = rawItems.filter((item: any) => {
            const status = String(item?.status || '').toLowerCase();
            const dueDate = String(item?.dueDate || '');
            const isClosed = status.includes('پرداخت شده') || status.includes('paid') || status.includes('settled') || status.includes('تسویه');
            return !isClosed && (dueDate === todayJ || status.includes('pass') || status.includes('معوق') || status.includes('overdue'));
          });
          dueCount = actionableDueItems.length;
          dueItems = actionableDueItems.slice(0, 3).map((item: any) => ({
            saleId: item?.saleId ? Number(item.saleId) : undefined,
            dueDate: String(item?.dueDate || ''),
            amount: Number(item?.amount || 0),
            customerFullName: String(item?.customerFullName || ''),
            status: String(item?.status || ''),
          }));
        }

        let financePulse: HeaderFinancePulse = {
          realizedProfit: 0,
          realizedRevenue: 0,
          unrecognizedProfit: 0,
          collectionRate: 0,
        };
        if (isFeatureEnabled('advanced_reports') && financeRes.status === 'fulfilled' && financeRes.value?.ok) {
          const js = await financeRes.value.json().catch(() => ({} as any));
          const profit = js?.data?.profit || {};
          financePulse = {
            realizedProfit: Number(profit?.realizedProfit || 0),
            realizedRevenue: Number(profit?.realizedRevenue || 0),
            unrecognizedProfit: Number(profit?.unrecognizedProfit || 0),
            collectionRate: Number(profit?.collectionRate || 0),
          };
        }

        if (alive) {
          setHeaderQuickStats({ salesCount, notificationsCount, dueCount });
          setHeaderQuickPanels({ sales: salesPreview, notifications: notificationItems, due: dueItems });
          setHeaderFinancePulse(financePulse);
        }
      } catch (err) {
        console.warn('header quick stats load failed:', err);
      } finally {
        if (alive) setHeaderQuickLoading(false);
      }
    };

    loadHeaderQuickStats();
    const interval = window.setInterval(loadHeaderQuickStats, 60000);
    return () => {
      alive = false;
      window.clearInterval(interval);
    };
  }, [authReady, token, currentUser, isFeatureEnabled, headerQuickRefreshKey, location.pathname]);

  useEffect(() => {
    if (!authReady || !token || !currentUser) return;
    let alive = true;

    const loadRiskyCustomers = async () => {
      try {
        const res = await apiFetch('/api/customers/trust-profiles');
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json?.success || !Array.isArray(json?.data)) throw new Error(json?.message || 'خطا در دریافت مشتریان پرریسک');

        const profiles = json.data as Array<any>;
        const risky = profiles.filter((profile) => {
          const score = Number(profile?.score || 0);
          const lateOrOverdue = Number(profile?.latePaymentCount || 0) + Number(profile?.overdueUnpaidCount || 0);
          const returnedChecks = Number(profile?.returnedCheckCount || 0);
          return score < 50 || lateOrOverdue > 0 || returnedChecks > 0;
        });

        if (alive) {
          setHeaderRiskyCustomers({
            totalRisky: risky.length,
            lowScore: risky.filter((profile) => Number(profile?.score || 0) < 50).length,
            lateOrOverdue: risky.filter((profile) => Number(profile?.latePaymentCount || 0) + Number(profile?.overdueUnpaidCount || 0) > 0).length,
            returnedChecks: risky.filter((profile) => Number(profile?.returnedCheckCount || 0) > 0).length,
          });
        }
      } catch {
        if (alive) setHeaderRiskyCustomers({ totalRisky: 0, lowScore: 0, lateOrOverdue: 0, returnedChecks: 0 });
      }
    };

    loadRiskyCustomers();
    const interval = window.setInterval(loadRiskyCustomers, 90000);
    return () => {
      alive = false;
      window.clearInterval(interval);
    };
  }, [authReady, token, currentUser, headerQuickRefreshKey, location.pathname]);

  const refreshHeaderQuickPanels = useCallback(() => {
    setHeaderQuickRefreshKey((value) => value + 1);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const refreshOnFocus = () => refreshHeaderQuickPanels();
    const refreshOnVisibility = () => {
      if (document.visibilityState === 'visible') refreshHeaderQuickPanels();
    };

    window.addEventListener('kourosh:header-quick-refresh', refreshHeaderQuickPanels);
    window.addEventListener('kourosh:notifications-updated', refreshHeaderQuickPanels);
    window.addEventListener('kourosh:installments-updated', refreshHeaderQuickPanels);
    window.addEventListener('kourosh:installment-payment-updated', refreshHeaderQuickPanels);
    window.addEventListener('focus', refreshOnFocus);
    document.addEventListener('visibilitychange', refreshOnVisibility);

    return () => {
      window.removeEventListener('kourosh:header-quick-refresh', refreshHeaderQuickPanels);
      window.removeEventListener('kourosh:notifications-updated', refreshHeaderQuickPanels);
      window.removeEventListener('kourosh:installments-updated', refreshHeaderQuickPanels);
      window.removeEventListener('kourosh:installment-payment-updated', refreshHeaderQuickPanels);
      window.removeEventListener('focus', refreshOnFocus);
      document.removeEventListener('visibilitychange', refreshOnVisibility);
    };
  }, [refreshHeaderQuickPanels]);

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

  const headerQuickActionsRaw = [
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
  ] as const;

  const headerQuickActions = headerQuickActionsRaw.filter((action) => {
    if (action.key === 'sales') return isFeatureEnabled('cash_sales');
    if (action.key === 'due') return isFeatureEnabled('installments');
    if (action.key === 'notifications') return isFeatureEnabled('notifications_outbox');
    return true;
  });

  const getQuickActionAccent = (key: 'sales' | 'due' | 'notifications', count: number) => {
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


  useEffect(() => {
    const updateQuickMenuPositions = () => {
      if (typeof window === 'undefined') return;
      const viewportPadding = 14;
      const panelWidth = Math.min(340, Math.max(292, window.innerWidth - viewportPadding * 2));
      const gap = 10;
      const next: Record<'sales' | 'due' | 'notifications', HeaderQuickMenuSmartStyle> = {
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

  const renderQuickActionMenu = (key: 'sales' | 'due' | 'notifications') => {
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
                  <i className="fa-solid fa-chart-simple text-sky-600 dark:text-sky-300" /> نبض مالی ماه
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

  if (authProcessLoading && !authReady) {
    return (
      <header
        className="header-premium-shell relative z-[140] bg-white/96 dark:bg-slate-950/96 border-b border-slate-200/80 dark:border-slate-800/90 backdrop-blur-xl flex items-center justify-between gap-2 px-2.5 sm:px-3 md:px-3.5"
        data-ui-navigation="header"
        data-ui-shell="topbar"
        style={{ minHeight: 'calc(var(--app-header-h) - 4px)' }}
      >
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{pageTitle || 'بارگذاری...'}</h2>
        <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 animate-pulse" />
      </header>
    );
  }

  if (authReady && !currentUser) {
    return (
      <header
        className="header-premium-shell relative z-[140] bg-white/96 dark:bg-slate-950/96 border-b border-slate-200/80 dark:border-slate-800/90 backdrop-blur-xl flex items-center justify-between gap-2 px-2.5 sm:px-3 md:px-3.5"
        data-ui-navigation="header"
        data-ui-shell="topbar"
        data-auth-state="guest"
        style={{ minHeight: 'calc(var(--app-header-h) - 4px)' }}
      >
        {/* When not authenticated, show the title only */}
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{pageTitle || 'ورود به سیستم'}</h2>
      </header>
    );
  }

  return (
    <header
      className="header-premium-shell relative z-[140] bg-white/96 dark:bg-slate-950/96 border-b border-slate-200/80 dark:border-slate-800/90 backdrop-blur-xl flex items-center justify-between gap-2 px-2.5 sm:px-3 md:px-3.5"
      data-ui-navigation="header"
      data-ui-shell="topbar"
      data-auth-state="authenticated"
      style={{ minHeight: 'calc(var(--app-header-h) - 4px)' }}
    >

      <div className="header-title-stack flex flex-col min-w-0">
      <div className="header-title-row flex items-center gap-2 min-w-0">
        <div className="min-w-0">
          <h2 className="text-[14px] sm:text-base md:text-[17px] font-black text-slate-800 dark:text-slate-100 truncate max-w-[48vw] sm:max-w-none">
            {pageTitle}
          </h2>

          {/* Breadcrumb (simple + RTL-friendly) */}
          {currentNav && (currentNav.parentTitle || currentNav.title) && (
            <div className="mt-0.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate max-w-[56vw] sm:max-w-none">
              {currentNav.parentTitle ? (
                <>
                  <span className="font-semibold">{currentNav.parentTitle}</span>
                  <span className="mx-1 opacity-60">/</span>
                </>
              ) : null}
              <span>{currentNav.title ?? pageTitle}</span>
            </div>
          )}
        </div>
      {canFavorite && currentNav && (
        <button
          type="button"
          onClick={() =>
            toggleFavorite({
              key: currentNav.path,
              title: currentNav.title,
              path: currentNav.path,
              icon: currentNav.icon,
              parentTitle: currentNav.parentTitle,
            })
          }
          data-skip-global-button="true"
          className="header-action-icon header-favorite-button grid h-8 w-8 place-items-center rounded-full border border-slate-300 bg-white text-slate-700 transition-colors hover:bg-slate-50 active:scale-[0.98] dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          title={isFavorite(currentNav.path) ? 'حذف مورد از علاقه‌مندی‌ها' : 'افزودن مورد جدید به علاقه‌مندی‌ها'}
          aria-label="علاقه‌مندی"
        >
          <i className={isFavorite(currentNav.path) ? 'fa-solid fa-star text-amber-500' : 'fa-regular fa-star'} />
        </button>
      )}
        </div>

      </div>

      {/* Search */}
      <div className="hidden md:flex flex-1 items-center justify-center px-2.5">
        <div dir="ltr" className="header-search-v436 w-full max-w-[40rem]">
          <button
            data-skip-global-button="true"
            type="button"
            onClick={() => { stashPaletteQuery(searchQuery); onOpenCommandPalette?.(); }}
            className="header-search-v436__quick header-command-button"
            aria-label="جستجوی سریع"
            title="جستجوی سریع (Ctrl/⌘+K)"
          >
            <i className="fa-solid fa-bolt" />
          </button>

          <form onSubmit={handleSearchSubmit} className="header-search-v436__shell">
            <input
              dir="rtl"
              type="text"
              placeholder="جستجوی سراسری؛ برای نقشه کامل مسیرها از سایدبار استفاده کن..."
              value={searchQuery}
              onChange={(e) => {
                const v = e.target.value;
                setSearchQuery(v);
                const p = processQuery(v);
                setSuggestion(p.suggestion ?? null);
              }}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 120)}
              className="header-search-v436__input"
              aria-label="جستجوی سراسری داده‌ها؛ ناوبری کامل در سایدبار است"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              data-skip-global-button="true"
              type="submit"
              className="header-search-v436__submit"
              aria-label="شروع جستجوی سراسری"
            >
              <i className="fa-solid fa-search" />
            </button>

            {searchFocused && (
              <div className="absolute top-[calc(100%+26px)] inset-x-0 z-[340] overflow-hidden rounded-[28px] border border-slate-200/95 bg-white shadow-[0_32px_90px_-36px_rgba(15,23,42,0.34),0_18px_36px_-28px_rgba(15,23,42,0.22)] ring-1 ring-slate-950/5 dark:border-slate-700/90 dark:bg-slate-950 dark:shadow-[0_34px_96px_-38px_rgba(2,6,23,0.72),0_16px_30px_-24px_rgba(2,6,23,0.5)] dark:ring-white/5">
                <div className="header-search-scope-note mx-3 mt-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3 py-2 text-[11px] font-bold text-slate-500 dark:border-slate-700/70 dark:bg-slate-900/50 dark:text-slate-300">
                  <i className="fa-solid fa-magnifying-glass-chart" /> جستجوی هدر برای داده‌هاست؛ سایدبار نقشه کامل مسیرها و موبایل اکشن سریع فروش است.
                </div>
                {(globalLoading || globalError || globalResults.length > 0) && (
                  <div className="border-b border-gray-100 dark:border-gray-700/60 p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
                        نتایج جستجوی سراسری
                        {globalResults.length > 0 ? <span className="mr-2 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-black text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{globalResults.length.toLocaleString('fa-IR')} نتیجه</span> : null}
                      </div>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => openSearchResultsPage(searchQuery)}
                        className="text-[11px] font-semibold text-primary-700 hover:text-primary-800 dark:text-primary-300"
                      >
                        نمایش همه نتایج
                      </button>
                    </div>
                    {globalLoading ? (
                      <div className="grid gap-2">
                        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 rounded-2xl bg-gray-100/90 dark:bg-gray-700/50 animate-pulse" />)}
                      </div>
                    ) : globalError ? (
                      <div className="rounded-2xl border border-rose-100 bg-rose-50/80 px-3 py-2 text-xs text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">{globalError}</div>
                    ) : (
                      <div className="grid gap-2">
                        {globalResults.slice(0, 5).map((item) => {
                          const meta = headerDomainMeta(item.domain);
                          return (
                            <button
                              key={`${item.domain}:${item.id}`}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => openGlobalResult(item)}
                              className="flex items-center gap-3 rounded-2xl border border-slate-200/90 bg-white px-3 py-2 text-right shadow-[0_10px_24px_-22px_rgba(15,23,42,0.18)] transition hover:border-primary-200 hover:bg-primary-50/60 hover:shadow-[0_18px_34px_-24px_rgba(14,165,233,0.18)] dark:border-slate-700/80 dark:bg-slate-900 dark:hover:border-primary-400/30 dark:hover:bg-primary-500/10"
                            >
                              <div className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${meta.accent} dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700`}>
                                <i className={meta.icon} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="shrink-0 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-bold text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">{meta.label}</span>
                                  <div className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                                    {item.titleHL ? <span dangerouslySetInnerHTML={{ __html: item.titleHL }} /> : (item.title || `#${item.id}`)}
                                  </div>
                                </div>
                                {item.subtitle ? <div className="truncate text-xs text-gray-500 dark:text-gray-400">{item.subtitle}</div> : null}
                                {item.snippet ? (
                                  <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                                    <span className="ml-1 font-black text-slate-400 dark:text-slate-500">تطابق:</span>
                                    <span dangerouslySetInnerHTML={{ __html: item.snippet }} />
                                  </div>
                                ) : !item.subtitle ? <div className="truncate text-xs text-gray-500 dark:text-gray-400">برای مشاهده جزئیات باز کنید.</div> : null}
                                {item.matchSource ? (
                                  <div className="mt-1 inline-flex max-w-full items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200" title={item.matchReason || item.matchSource}>
                                    <i className="fa-solid fa-ranking-star" />
                                    <span className="truncate">{item.matchSource}</span>
                                  </div>
                                ) : null}
                              </div>
                              <i className="fa-solid fa-arrow-up-from-bracket text-xs text-gray-400" />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
                {!!relatedSearches.length && (
                  <div className="p-3 border-b border-gray-100 dark:border-gray-700/60">
                    <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-2">پیشنهادهای مرتبط</div>
                    <div className="flex flex-wrap gap-2">
                      {relatedSearches.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => { setSearchQuery(item); runGlobalSearch(item); }}
                          className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700 dark:border-gray-600 dark:bg-gray-700/60 dark:text-gray-200 dark:hover:border-primary-400/40 dark:hover:bg-primary-500/10"
                        >
                          <i className="fa-solid fa-star text-[10px]" />
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-3 p-3 lg:grid-cols-2">
                  <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-3 dark:border-gray-700/60 dark:bg-gray-900/30">
                    <div className="mb-2 flex items-center gap-2 text-[11px] font-bold text-gray-500 dark:text-gray-400">
                      <i className="fa-regular fa-clock" /> آخرین جستجوها
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {recentSearches.length ? recentSearches.slice(0,6).map((item) => (
                        <button
                          key={item.query}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => { setSearchQuery(item.query); runGlobalSearch(item.query); }}
                          className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 hover:border-primary-200 hover:text-primary-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                        >
                          <i className="fa-solid fa-rotate-left text-[10px]" />
                          {item.query}
                        </button>
                      )) : <div className="text-xs text-gray-400">هنوز جستجویی ثبت اطلاعات نشده است.</div>}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-3 dark:border-gray-700/60 dark:bg-gray-900/30">
                    <div className="mb-2 flex items-center gap-2 text-[11px] font-bold text-gray-500 dark:text-gray-400">
                      <i className="fa-solid fa-fire" /> پرجستجوها
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {popularSearches.length ? popularSearches.slice(0,6).map((item) => (
                        <button
                          key={item.query}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => { setSearchQuery(item.query); runGlobalSearch(item.query); }}
                          className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-700 hover:bg-amber-100 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200"
                        >
                          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/80 px-1 text-[10px] font-bold dark:bg-black/20">{item.count}</span>
                          {item.query}
                        </button>
                      )) : <div className="text-xs text-gray-400">بعد از چند جستجو اینجا پیشنهادهای پرتکرار را می‌بینی.</div>}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Mobile Search Trigger */}
      <div className="md:hidden flex-1 flex justify-end px-2">
        <button
          onClick={() => onOpenCommandPalette?.()}
          data-skip-global-button="true"
          className="grid h-9 w-9 place-items-center rounded-full bg-transparent text-slate-700 transition hover:bg-transparent dark:text-slate-200"
          aria-label="جستجو"
          title="جستجوی داده‌ها؛ ناوبری کامل در سایدبار"
        >
          <i className="fa-solid fa-search" />
        </button>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1.5">
        <Link
          to="/customers?risk=risky"
          data-skip-global-button="true"
          className={[
            'hidden xl:inline-flex h-10 min-w-[124px] items-center justify-between gap-2 rounded-[16px] border px-3 py-1.5 text-[11px] font-black transition-all duration-200',
            'shadow-[0_10px_24px_-20px_rgba(15,23,42,0.18)] ring-1 hover:-translate-y-[1px] hover:shadow-[0_14px_28px_-22px_rgba(15,23,42,0.24)]',
            headerRiskLevelClass,
          ].join(' ')}
          title={headerRiskyCustomers.totalRisky > 0 ? `سطح هشدار: ${headerRiskLevelLabel} • دیرکرد/معوق: ${headerRiskyCustomers.lateOrOverdue.toLocaleString('fa-IR')} • چک برگشتی: ${headerRiskyCustomers.returnedChecks.toLocaleString('fa-IR')}` : 'مشتری پرریسک فعالی دیده نشد'}
        >
          <span className="inline-flex items-center gap-2">
            <i className={headerRiskLevel === 'clear' ? 'fa-solid fa-user-check' : headerRiskLevel === 'critical' ? 'fa-solid fa-circle-exclamation' : 'fa-solid fa-triangle-exclamation'} />
            مشتریان پرریسک
            {headerRiskLevel !== 'clear' ? (
              <span className="rounded-full bg-white/45 px-1.5 py-0.5 text-[9px] font-black dark:bg-black/20">
                {headerRiskLevelLabel}
              </span>
            ) : null}
          </span>
          <span className={[
            'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-black',
            headerRiskBadgeClass,
          ].join(' ')}>
            {headerRiskyCustomers.totalRisky.toLocaleString('fa-IR')}
          </span>
        </Link>
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
                >
                  <span className="relative z-[1] inline-flex min-w-0 flex-1 items-center gap-2.5">
                    <span className="block whitespace-nowrap leading-none text-[11px]">{action.label}</span>
                    <span className="relative inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[13px] border border-white/80 bg-white/90 text-[11px] text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_16px_-14px_rgba(15,23,42,0.24)] ring-1 ring-white/55 dark:border-white/10 dark:bg-slate-900/88 dark:text-slate-100 dark:ring-white/5">
                      <i className={action.icon} />
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
                  <i className={['relative z-[1] fa-solid fa-angle-down text-[9px] opacity-55 transition duration-200', isOpen ? 'rotate-180 opacity-100' : 'group-hover:translate-y-0.5 group-hover:opacity-100'].join(' ')} />
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
                      <i className="fa-solid fa-xmark text-[10px]" /> بستن
                    </button>
                    <Link
                      to={action.to}
                      onClick={() => setActiveQuickMenu(null)}
                      className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-black text-white shadow-[0_16px_30px_-22px_rgba(15,23,42,0.34)] transition hover:bg-slate-800 hover:shadow-[0_20px_34px_-24px_rgba(15,23,42,0.32)] dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                    >
                      مشاهده کامل <i className="fa-solid fa-arrow-up-from-bracket text-[10px]" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Theme Toggle (متصل به StyleContext) */}
        <button
          onClick={cycleTheme}
          title={
            style.theme === 'light'
              ? 'حالت روشن (کلیک: تیره)'
              : style.theme === 'dark'
              ? 'حالت تیره (کلیک: سیستمی)'
              : 'حالت سیستمی (کلیک: روشن)'
          }
          aria-label="تغییر تم"
          data-skip-global-button="true"
          className="header-action-icon grid h-9 w-9 place-items-center rounded-[15px] border border-slate-200/80 bg-white/82 text-slate-700 shadow-[0_10px_22px_-18px_rgba(15,23,42,0.26)] ring-1 ring-white/60 transition-all duration-200 hover:-translate-y-[1px] hover:bg-white hover:shadow-[0_14px_28px_-22px_rgba(15,23,42,0.32)] dark:border-slate-700/80 dark:bg-slate-950/70 dark:text-slate-200 dark:ring-white/5 dark:hover:bg-slate-900/88"
        >
          <ThemeIcon />
        </button>

        {/* Profile menu */}
        <div className="relative" ref={profileMenuRef}>
          {currentUser && (
            <>
<button
                onClick={toggleProfileMenu}
                data-skip-global-button="true" className="header-flat-icon-btn header-action-icon grid h-9 w-9 place-items-center rounded-[15px] border border-slate-200/80 bg-white/82 text-slate-700 shadow-[0_10px_22px_-18px_rgba(15,23,42,0.26)] ring-1 ring-white/60 transition-all duration-200 hover:-translate-y-[1px] hover:bg-white hover:shadow-[0_14px_28px_-22px_rgba(15,23,42,0.32)]    dark:border-slate-700/80 dark:bg-slate-950/70 dark:text-slate-200 dark:ring-white/5 dark:hover:bg-slate-900/88"
                aria-expanded={isProfileMenuOpen}
                aria-haspopup="true"
                aria-controls="profile-menu"
                aria-label="حساب کاربری"
                title="حساب کاربری"
              >
                <i className="fa-regular fa-user text-[14px]" />
              </button>

              {isProfileMenuOpen && (
                <div
                  id="profile-menu"
                  className="absolute left-0 mt-3 w-48 rounded-[24px] border border-slate-200/95 bg-white p-2 shadow-[0_30px_80px_-34px_rgba(15,23,42,0.34),0_16px_30px_-22px_rgba(15,23,42,0.18)] ring-1 ring-slate-950/5 z-[380] text-right dark:border-slate-700/90 dark:bg-slate-950 dark:shadow-[0_34px_90px_-38px_rgba(2,6,23,0.76),0_16px_28px_-22px_rgba(2,6,23,0.5)] dark:ring-white/5"
                  role="menu"
                >
                  <Link
                    to="/profile"
                    role="menuitem"
                    className="flex items-center gap-2 rounded-2xl border border-transparent px-3 py-2.5 text-sm font-bold text-slate-700 transition-all duration-200 hover:border-slate-200/90 hover:bg-slate-50 hover:shadow-[0_14px_28px_-24px_rgba(15,23,42,0.22)] hover:text-slate-900 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900/70"
                  >
                    <i className="fas fa-user-circle text-slate-600 dark:text-slate-300" />
                    پروفایل شما
                  </Link>

                  {currentUser.roleName === 'Admin' && (
                    <Link
                      to="/settings"
                      role="menuitem"
                      className="mt-1 flex items-center gap-2 rounded-2xl border border-transparent px-3 py-2.5 text-sm font-bold text-slate-700 transition-all duration-200 hover:border-slate-200/90 hover:bg-slate-50 hover:shadow-[0_14px_28px_-24px_rgba(15,23,42,0.22)] hover:text-slate-900 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900/70"
                    >
                      <i className="fas fa-cog text-slate-600 dark:text-slate-300" />
                      تنظیمات
                    </Link>
                  )}

                  <div className="my-2 border-t border-slate-200 dark:border-slate-700" />
                  <button
                    onClick={handleLogout}
                    role="menuitem"
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200/95 bg-white px-3 py-2 text-sm font-black text-slate-700 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.22)] ring-1 ring-slate-950/5 transition-all duration-200 hover:-translate-y-0.5 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 hover:shadow-[0_18px_34px_-24px_rgba(244,63,94,0.18)] dark:border-slate-700/90 dark:bg-slate-950 dark:text-slate-200 dark:ring-white/5 dark:hover:border-rose-400/30 dark:hover:bg-rose-500/10 dark:hover:text-rose-200"
                  >
                    <i className="fas fa-sign-out-alt" />
                    خروج از حساب
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
