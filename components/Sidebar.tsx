// components/Sidebar.tsx
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

import { SIDEBAR_ITEMS } from '../constants';
import { NavItem } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../utils/apiFetch';
import { useStyle } from '../contexts/StyleContext';
import { applyDocumentBranding, normalizeStoreName, writeStoredBranding } from '../utils/branding';
import { loadAuthedAssetUrl, revokeObjectUrlSafe } from '../utils/loadAuthedAssetUrl';
import { useFavorites } from '../contexts/FavoritesContext';
import { findNavByPath, normalizePath } from '../utils/nav';
import { canAccessPath, filterNavItemsByRole } from '../utils/rbac';
import { useFeatureFlags } from '../contexts/FeatureFlagsContext';
import { filterNavItemsByFeatures } from '../utils/featureFlags';

type Accent = { ring: string };

/** 🎨 الگوی برند (به primary وصل است) */
const PRIMARY_ACCENT: Accent = {
  ring: 'ring-slate-300/70 dark:ring-slate-700/80',
};

const ACCENTS: Record<string, Accent> = {};

const getAccent = (id: string, parentId?: string): Accent => {
  if (ACCENTS[id]) return ACCENTS[id];
  if (parentId && ACCENTS[parentId]) return ACCENTS[parentId];
  return PRIMARY_ACCENT;
};

const isActivePath = (pathname: string, itemPath?: string) => {
  if (!itemPath) return false;
  if (itemPath === '/') return pathname === '/';
  return pathname === itemPath || pathname.startsWith(itemPath + '/');
};

const isItemActive = (pathname: string, item: NavItem): boolean => {
  if (isActivePath(pathname, item.path)) return true;
  if (item.children?.length) return item.children.some((c) => isItemActive(pathname, c));
  return false;
};

// Active-box contract:
// - A parent/group can be open because one of its children is active.
// - But the visual active box must stay only on the exact route row.
// - For groups with a hub path like /reports, /reports/* must not make the parent boxed.
const isExactRouteActive = (pathname: string, item: NavItem): boolean => {
  if (!item.path) return false;
  if (item.path === '/') return pathname === '/';

  // Parent rows with children are navigational groups.
  // Even if the parent path is the current page, the boxed active state must stay on the matching child row
  // so the group header only acts as an open/section indicator.
  if (item.children?.length) return false;

  return isActivePath(pathname, item.path);
};


const FLYOUT_SUBTITLE_MAP: Record<string, string> = {
  dashboard: 'پیشخوان مدیریتی، شاخص‌های روز و دسترسی‌های سریع',
  customers: 'لیست مشتریان، پرونده‌ها و پیگیری تعاملات',
  customer: 'لیست مشتریان، پرونده‌ها و پیگیری تعاملات',
  partners: 'مدیریت همکاران، تأمین‌کننده‌ها و حساب همکاری',
  partner: 'مدیریت همکاران، تأمین‌کننده‌ها و حساب همکاری',
  inventory: 'موجودی، ورود و خروج کالا و کنترل انبار',
  product: 'مدیریت کالاها، دسته‌بندی و وضعیت فروش',
  products: 'مدیریت کالاها، دسته‌بندی و وضعیت فروش',
  report: 'گزارش‌های رسمی مالی، فروش و تحلیل عملکرد',
  reports: 'گزارش‌های رسمی مالی، فروش و تحلیل عملکرد',
  repair: 'ثبت اطلاعات، پیگیری و تحویل تعمیرات مشتریان',
  repairs: 'ثبت اطلاعات، پیگیری و تحویل تعمیرات مشتریان',
  installment: 'فروش اقساطی، سررسیدها و مدیریت پرداخت‌ها',
  installments: 'فروش اقساطی، سررسیدها و مدیریت پرداخت‌ها',
  sale: 'ثبت اطلاعات فروش، فاکتور و عملیات روزانه فروش',
  sales: 'ثبت اطلاعات فروش، فاکتور و عملیات روزانه فروش',
  purchase: 'ثبت اطلاعات خرید، تأمین کالا و گردش هزینه',
  purchases: 'ثبت اطلاعات خرید، تأمین کالا و گردش هزینه',
  expense: 'هزینه‌ها، پرداخت‌ها و کنترل مخارج',
  expenses: 'هزینه‌ها، پرداخت‌ها و کنترل مخارج',
  notification: 'اعلان‌ها، پیگیری‌ها و رویدادهای مهم سیستم',
  notifications: 'اعلان‌ها، پیگیری‌ها و رویدادهای مهم سیستم',
  setting: 'پیکربندی سیستم، برند و تنظیمات عملیاتی',
  settings: 'پیکربندی سیستم، برند و تنظیمات عملیاتی',
  'store-ownership': 'ساختار شرکا، سهم سود، مالکیت موجودی و اتصال داده‌های قدیمی',
  message: 'پیام‌ها، ارسال‌ها و وضعیت صف ارتباطات',
  sms: 'پیامک‌ها، الگوها و لاگ ارسال',
  telegram: 'تنظیمات تلگرام، قالب‌ها و وضعیت اتصال',
  outbox: 'پیام‌های در صف، خطا در عملیاتها و تاریخچه ارسال',
  more: 'آیتم‌های مدیریتی و کم‌تکرار؛ سطح اصلی سایدبار برای عملیات روزانه خلوت می‌ماند',
  'settings-home': 'تنظیمات عمومی سیستم، برند، دسترسی‌ها و پیکربندی‌های اصلی',
  invoice: 'فاکتورها، چاپ و سوابق صدور',
  invoices: 'فاکتورها، چاپ و سوابق صدور',
  profile: 'مشاهده حساب کاربری و تنظیمات شخصی',
};

const getNavSurfaceRole = (item: NavItem, parent?: NavItem) => {
  const haystack = [item.id, item.path || '', item.name || '', parent?.id || '', parent?.path || '']
    .map((value) => String(value).toLowerCase())
    .join(' ');

  if (/more|بیشتر/.test(haystack)) return { label: 'مسیرهای تکمیلی', hint: 'بخش‌های مدیریتی و کم‌تکرار اینجا جمع شده‌اند تا منوی اصلی خلوت بماند.' };
  if (/report|گزارش/.test(haystack)) return { label: 'منبع رسمی گزارش', hint: 'گزارش‌ها مرجع رسمی تحلیل و خروجی هستند؛ هدر فقط پیش‌نمایش می‌دهد.' };
  if (/dashboard|پیشخوان|داشبورد/.test(haystack)) return { label: 'تصمیم سریع', hint: 'پیشخوان برای تصمیم روزانه است، نه جایگزین گزارش رسمی.' };
  if (/notification|اعلان/.test(haystack)) return { label: 'مرکز پیگیری', hint: 'اعلان‌ها از هدر پیش‌نمایش می‌شوند و اینجا مرکز کامل پیگیری است.' };
  if (/sale|فروش/.test(haystack)) return { label: 'مسیر عملیاتی', hint: 'شروع عملیات فروش از Dashboard/Mobile سریع‌تر است؛ این مسیر نقشه کامل بخش است.' };
  return { label: 'نقشه ناوبری', hint: parent?.name ? `مسیر بخش ${parent.name}` : 'مسیر رسمی این بخش' };
};

const getFlyoutSubtitle = (item: NavItem, parent?: NavItem) => {
  const haystacks = [item.id, item.path || '', item.name || '', parent?.id || '', parent?.path || '']
    .map((value) => String(value).toLowerCase());

  const match = Object.entries(FLYOUT_SUBTITLE_MAP).find(([key]) =>
    haystacks.some((value) => value.includes(key))
  );

  if (match) return `${match[1]}؛ ${getNavSurfaceRole(item, parent).hint}`;
  if (parent?.name) return `نقشه ناوبری به بخش ${parent.name}؛ اکشن عملیاتی سریع در پیشخوان/هدر مدیریت می‌شود`;
  return 'نقشه ناوبری این بخش؛ برای اجرای سریع کارهای روزانه از پیشخوان یا هدر استفاده کن';
};

const filterNavItems = (items: NavItem[], forbiddenIds: string[]): NavItem[] => {
  const forbidden = new Set(forbiddenIds);
  const walk = (arr: NavItem[]): NavItem[] =>
    arr
      .filter((it) => !forbidden.has(it.id))
      .map((it) => {
        const children = it.children?.length ? walk(it.children) : undefined;
        const next: NavItem = { ...it, children };
        // اگر یک گروه هیچ فرزندی نداشت و مسیر هم نداشت، حذفش می‌کنیم
        if ((!next.path || next.path.trim() === '') && (!next.children || next.children.length === 0)) {
          return null;
        }
        // اگر گروه خالی شد ولی مسیر دارد، نگه می‌داریم.
        return next;
      })
      .filter(Boolean) as NavItem[];
  return walk(items);
};

interface SidebarProps {
  /** Controls whether the sidebar is visible on mobile. On desktop this value is ignored */
  isOpen: boolean;
  /** Callback when the mobile sidebar wants to close */
  onClose?: () => void;

  /** Desktop mini mode (icon-only) */
  collapsed?: boolean;
  /** Called when user toggles collapse (desktop) */
  onToggleCollapse?: () => void;
  /** Explicit collapsed width (so layout matches MainLayout) */
  collapsedWidthPx?: number;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const collapsed = false;
  const collapsedWidthPx = 0;
  const { currentUser, token, authReady } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { style, computeSidebarWidthPx, syncBrandFromStoreName } = useStyle();
  const { flags: featureFlags, isEnabled: isFeatureEnabled } = useFeatureFlags();
  // Favorites (برای نمایش علاقه‌مندی‌ها در بالای منو)
  const { favorites, removeFavorite } = useFavorites();

  const roleName = currentUser?.roleName;
  const filteredNavItems = useMemo(() => filterNavItemsByRole(SIDEBAR_ITEMS, roleName), [roleName]);
  const visibleItems = useMemo(() => filterNavItemsByFeatures(filteredNavItems, featureFlags), [filteredNavItems, featureFlags]);
  const visibleFavorites = useMemo(() => favorites.filter((f) => canAccessPath(roleName, f.path)), [favorites, roleName]);
  const sidebarWidth = collapsed ? collapsedWidthPx : computeSidebarWidthPx();


  // فروشگاه
  const [storeName, setStoreName] = useState('فروشگاه');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  // وضعیت باز/بسته بودن گروه‌ها
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  // Flyout برای حالت mini sidebar
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null);
  const [flyoutLayout, setFlyoutLayout] = useState<{ left: number; top: number; width: number } | null>(null);
  const flyoutCloseTimer = useRef<number | null>(null);
  const FLYOUT_CLOSE_DELAY_MS = 180;
  const flyoutItemRefs = useRef<Record<string, HTMLLIElement | null>>({});
  const [navBadges, setNavBadges] = useState<Record<string, number>>({});

  const getBadgeCount = useCallback((item: NavItem): number => {
    const keys = [item.id, item.path || ''];
    let ownCount = 0;
    for (const key of keys) {
      if (!key) continue;
      if (navBadges[key] != null) {
        ownCount = navBadges[key];
        break;
      }
    }

    const childrenCount = item.children?.reduce((sum, child) => sum + getBadgeCount(child), 0) ?? 0;
    return ownCount + childrenCount;
  }, [navBadges]);

  const updateFlyoutLayout = useCallback((groupId: string) => {
    const anchor = flyoutItemRefs.current[groupId];
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 12;
    const gap = 12;
    const panelWidth = Math.min(280, Math.max(248, viewportWidth - margin * 2));
    const flyoutItemCount = Number(anchor.dataset.flyoutCount || '0');
    const estimatedHeight = Math.min(420, 120 + flyoutItemCount * 58);

    const preferredLeft = rect.left - panelWidth - gap;
    const fallbackLeft = viewportWidth - panelWidth - margin;
    const left = Math.max(margin, preferredLeft >= margin ? preferredLeft : fallbackLeft);

    const maxTop = Math.max(margin, viewportHeight - estimatedHeight - margin);
    const top = Math.min(Math.max(rect.top, margin), maxTop);

    setFlyoutLayout({ left, top, width: panelWidth });
  }, []);

  const cancelFlyoutClose = () => {
    if (flyoutCloseTimer.current !== null) {
      window.clearTimeout(flyoutCloseTimer.current);
      flyoutCloseTimer.current = null;
    }
  };

  const scheduleFlyoutClose = () => {
    cancelFlyoutClose();
    flyoutCloseTimer.current = window.setTimeout(() => {
      setHoveredGroupId(null);
    }, FLYOUT_CLOSE_DELAY_MS);
  };

  // Search inside sidebar (fast filter)
  const [navQuery, setNavQuery] = useState('');
  const sidebarSearchInputRef = useRef<HTMLInputElement | null>(null);

  // Stage 75: force-reset the actual DOM input with inline !important styles.
  // Some global input/focus rules in the app use !important and can override React inline styles.
  // setProperty(..., 'important') is the strongest scoped fix without changing other inputs.
  useLayoutEffect(() => {
    const input = sidebarSearchInputRef.current;
    if (!input) return;

    const importantStyles: Array<[string, string]> = [
      ['all', 'unset'],
      ['box-sizing', 'border-box'],
      ['display', 'block'],
      ['min-width', '0'],
      ['width', '100%'],
      ['height', 'var(--sidebar-search-h)'],
      ['line-height', 'var(--sidebar-search-h)'],
      ['background', 'transparent'],
      ['background-color', 'transparent'],
      ['border', '0'],
      ['border-radius', '0'],
      ['outline', '0'],
      ['box-shadow', 'none'],
      ['appearance', 'none'],
      ['-webkit-appearance', 'none'],
      ['color', 'inherit'],
      ['font', 'inherit'],
      ['font-size', '.78rem'],
      ['font-weight', '650'],
      ['direction', 'rtl'],
      ['text-align', 'right'],
      ['padding', '0 .55rem 0 .15rem'],
      ['white-space', 'nowrap'],
      ['overflow', 'hidden'],
      ['text-overflow', 'ellipsis'],
      ['-webkit-box-shadow', 'none'],
      ['--tw-ring-offset-width', '0px'],
      ['--tw-ring-offset-color', 'transparent'],
      ['--tw-ring-color', 'transparent'],
      ['--tw-ring-shadow', '0 0 #0000'],
      ['--tw-shadow', '0 0 #0000'],
      ['--tw-shadow-colored', '0 0 #0000'],
    ];

    const apply = () => {
      importantStyles.forEach(([key, value]) => input.style.setProperty(key, value, 'important'));
    };

    apply();

    const events: Array<keyof HTMLElementEventMap> = ['focus', 'blur', 'input', 'change', 'mousedown', 'mouseup', 'keydown', 'keyup'];
    events.forEach((eventName) => input.addEventListener(eventName, apply));
    return () => events.forEach((eventName) => input.removeEventListener(eventName, apply));
  }, []);

  const filteredByQuery = useMemo(() => {
    const q = navQuery.trim().toLowerCase();
    if (!q) return visibleItems;

    const walk = (items: NavItem[], parentId?: string): NavItem[] => {
      return items
        .map((it) => {
          const nameMatch = it.name?.toLowerCase().includes(q);
          const childMatches = it.children?.length ? walk(it.children, it.id) : [];
          const keep = nameMatch || childMatches.length > 0;
          if (!keep) return null;
          return { ...it, children: childMatches.length ? childMatches : it.children };
        })
        .filter(Boolean) as NavItem[];
    };
    return walk(visibleItems);
  }, [navQuery, visibleItems]);

  // دریافت تنظیمات فروشگاه
  useEffect(() => {
    const fetchStoreSettings = async () => {
      if (!authReady || !currentUser || currentUser.roleName !== 'Admin' || !token) {
        setIsLoadingSettings(false);
        return;
      }
      setIsLoadingSettings(true);
      try {
        const response = await apiFetch('/api/settings');
        if (!response.ok) throw new Error(`پاسخ شبکه صحیح نبود (${response.status})`);
        const result = await response.json();
        if (result.success && result.data) {
          const normalizedStoreName = normalizeStoreName(result.data.store_name || 'فروشگاه');
          setStoreName(normalizedStoreName);
          if (result.data.store_logo_path) {
            try {
              const nextUrl = await loadAuthedAssetUrl(`/uploads/${result.data.store_logo_path}?t=${Date.now()}`);
              setLogoUrl((prev) => {
                revokeObjectUrlSafe(prev);
                return nextUrl;
              });
            } catch (logoError) {
              const isMissingLogo = logoError instanceof Error && /404/.test(logoError.message);
              if (!isMissingLogo) {
                console.error('خطا در بارگذاری لوگوی فروشگاه:', logoError);
              }
              setLogoUrl((prev) => {
                revokeObjectUrlSafe(prev);
                return null;
              });
            }
          } else {
            setLogoUrl((prev) => {
              revokeObjectUrlSafe(prev);
              return null;
            });
          }
          writeStoredBranding({ storeName: normalizedStoreName, brandMode: style.brandMode });
          if (style.brandMode === 'auto') syncBrandFromStoreName(normalizedStoreName);
          applyDocumentBranding(normalizedStoreName);
        } else {
          throw new Error(result.message || 'خطا در قالب پاسخ تنظیمات');
        }
      } catch (error) {
        const isMissingLogo = error instanceof Error && /Asset request failed with 404/.test(error.message);
        if (!isMissingLogo) {
          console.error('خطا در دریافت تنظیمات فروشگاه:', error);
        }
        setStoreName('فروشگاه');
        setLogoUrl(null);
        applyDocumentBranding('فروشگاه');
      } finally {
        setIsLoadingSettings(false);
      }
    };
    fetchStoreSettings();
  }, [token, currentUser, authReady]);

  useEffect(() => {
    applyDocumentBranding(storeName);
  }, [storeName]);

  const loadSidebarBadges = useCallback(async () => {
    if (!authReady || !token || !currentUser) return;
    try {
      const [notificationsRes, calendarRes, outboxRes] = await Promise.allSettled([
        isFeatureEnabled('notifications_outbox') ? apiFetch('/api/notifications') : Promise.resolve(null as any),
        isFeatureEnabled('installments') ? apiFetch('/api/reports/installments-calendar') : Promise.resolve(null as any),
        isFeatureEnabled('notifications_outbox') && (currentUser.roleName === 'Admin' || currentUser.roleName === 'Manager')
          ? apiFetch('/api/notifications/outbox?status=pending&limit=200')
          : Promise.resolve(null as any),
      ]);

      let notificationsCount = 0;
      if (isFeatureEnabled('notifications_outbox') && notificationsRes.status === 'fulfilled' && notificationsRes.value?.ok) {
        const js = await notificationsRes.value.json();
        notificationsCount = Array.isArray(js?.data) ? js.data.length : 0;
      }

      let dueCount = 0;
      if (isFeatureEnabled('installments') && calendarRes.status === 'fulfilled' && calendarRes.value?.ok) {
        const js = await calendarRes.value.json();
        const items = Array.isArray(js?.data) ? js.data : [];
        const todayJ = new Date();
        const todayFa = new Intl.DateTimeFormat('en-CA-u-ca-persian', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(todayJ).replaceAll('-', '/');
        dueCount = items.filter((item: any) => {
          const status = String(item?.status || '').toLowerCase();
          const dueDate = String(item?.dueDate || '');
          const isClosed = status.includes('پرداخت شده') || status.includes('paid') || status.includes('closed') || status.includes('settled');
          return !isClosed && (dueDate === todayFa || status.includes('معوق') || status.includes('overdue') || status.includes('pass'));
        }).length;
      }

      let outboxCount = 0;
      if (isFeatureEnabled('notifications_outbox') && outboxRes.status === 'fulfilled' && outboxRes.value?.ok) {
        const js = await outboxRes.value.json();
        outboxCount = Array.isArray(js?.data) ? js.data.length : 0;
      }

      setNavBadges({
        notifications: notificationsCount,
        '/notifications': notificationsCount,
        outbox: outboxCount,
        '/outbox': outboxCount,
        'installment-sales': dueCount,
        '/installment-sales': dueCount,
        'installments-calendar': dueCount,
        '/reports/installments-calendar': dueCount,
      });
    } catch (err) {
      console.warn('sidebar badge load failed:', err);
    }
  }, [authReady, token, currentUser, isFeatureEnabled]);

  useEffect(() => {
    loadSidebarBadges();
  }, [loadSidebarBadges]);

  useEffect(() => {
    const refreshSidebarBadges = () => {
      void loadSidebarBadges();
    };
    const refreshOnVisibility = () => {
      if (document.visibilityState === 'visible') refreshSidebarBadges();
    };

    window.addEventListener('kourosh:header-quick-refresh', refreshSidebarBadges);
    window.addEventListener('kourosh:notifications-updated', refreshSidebarBadges);
    window.addEventListener('kourosh:installments-updated', refreshSidebarBadges);
    window.addEventListener('kourosh:installment-payment-updated', refreshSidebarBadges);
    window.addEventListener('focus', refreshSidebarBadges);
    document.addEventListener('visibilitychange', refreshOnVisibility);

    return () => {
      window.removeEventListener('kourosh:header-quick-refresh', refreshSidebarBadges);
      window.removeEventListener('kourosh:notifications-updated', refreshSidebarBadges);
      window.removeEventListener('kourosh:installments-updated', refreshSidebarBadges);
      window.removeEventListener('kourosh:installment-payment-updated', refreshSidebarBadges);
      window.removeEventListener('focus', refreshSidebarBadges);
      document.removeEventListener('visibilitychange', refreshOnVisibility);
    };
  }, [loadSidebarBadges]);

  // باز کردن خودکار گروه مربوط به مسیر جاری
  useEffect(() => {
    const pathname = location.pathname;
    const collectActiveGroups = (items: NavItem[], parents: string[] = []): string[] => {
      let open: string[] = [];
      for (const it of items) {
        const active = isItemActive(pathname, it);
        if (active && it.children?.length) open.push(it.id);
        if (it.children?.length) open = open.concat(collectActiveGroups(it.children, [...parents, it.id]));
      }
      return open;
    };

    const toOpen = new Set(collectActiveGroups(visibleItems));
    // فقط مسیر فعال باز بماند؛ بازماندن گروه‌های قبلی باعث حس selected اشتباه در سایدبار می‌شد.
    setOpenGroups(() => {
      const next: Record<string, boolean> = {};
      toOpen.forEach((id) => {
        next[id] = true;
      });
      return next;
    });
  }, [location.pathname, visibleItems]);

  useEffect(() => {
    return () => {
      if (flyoutCloseTimer.current !== null) {
        window.clearTimeout(flyoutCloseTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!collapsed || !hoveredGroupId) return;

    const syncPosition = () => updateFlyoutLayout(hoveredGroupId);
    syncPosition();

    window.addEventListener('resize', syncPosition);
    window.addEventListener('scroll', syncPosition, true);
    return () => {
      window.removeEventListener('resize', syncPosition);
      window.removeEventListener('scroll', syncPosition, true);
    };
  }, [collapsed, hoveredGroupId, updateFlyoutLayout]);

  const toggleGroup = (id: string, parentId?: string) => {
    setOpenGroups((prev) => {
      const willOpen = !prev[id];
      // Accordion contract: در حالت عادی فقط یک شاخه از منو باز می‌ماند.
      // این کار هم زیرمنوی قبلی را می‌بندد، هم ظاهر selected کاذب را حذف می‌کند.
      if (!willOpen) {
        return parentId ? { [parentId]: true } : {};
      }
      return parentId ? { [parentId]: true, [id]: true } : { [id]: true };
    });
  };

  const Row: React.FC<{
    item: NavItem;
    depth: number;
    parentId?: string;
  }> = ({ item, depth, parentId }) => {
    const acc = getAccent(item.id, parentId);
    const branchActive = isItemActive(location.pathname, item);
    const routeActive = isExactRouteActive(location.pathname, item);
    const hasChildren = !!item.children?.length;
    const isOpen = !!openGroups[item.id];

    const iconPx = depth === 0 ? style.sidebarIconPx : Math.max(22, Math.round(style.sidebarIconPx * 0.74));
    const rowMinHeight = depth === 0 ? 'var(--sidebar-item-h)' : 'var(--sidebar-subitem-h)';
    const labelClass = depth === 0 ? 'text-[11px] font-semibold tracking-tight' : 'text-[10px] font-medium text-slate-500 dark:text-slate-400';
    const indent = depth === 0 ? '' : 'pr-4';
    const showCollapsedFlyout = collapsed && depth === 0 && hasChildren && hoveredGroupId === item.id;
    const badgeCount = getBadgeCount(item);

    const handleCollapsedEnter = () => {
      if (!(collapsed && depth === 0 && hasChildren)) return;
      cancelFlyoutClose();
      updateFlyoutLayout(item.id);
      setHoveredGroupId(item.id);
    };

    const handleCollapsedLeave = () => {
      if (!(collapsed && depth === 0 && hasChildren)) return;
      scheduleFlyoutClose();
    };

    const onClick = (e: React.MouseEvent) => {
      if (hasChildren) {
        // Mini sidebar: go to group hub (or first child) instead of expanding hidden children
        if (collapsed && depth === 0) {
          const target = item.path || item.children?.find((c) => c.path)?.path;
          if (target) {
            navigate(target);
          }
          if (onClose) onClose();
          e.preventDefault();
          return;
        }

        // Normal: toggle group + optionally navigate
        toggleGroup(item.id, parentId);
        if (item.path) {
          navigate(item.path);
        }
        e.preventDefault();
        return;
      }

      // آیتم عادی
      if (onClose) onClose();
    };

    // رندر دکمه/لینک
    // فقط route واقعی باید selected باشد. باز بودن یک گروه نباید باکس active کامل بسازد.
    const isActiveRow = routeActive;
    const isOpenRow = isOpen && hasChildren && !routeActive;
    const rowStyle = { minHeight: rowMinHeight };

    const content = (
      <div
        className={[
          'sidebar-nav-row group relative flex items-center w-full whitespace-nowrap cursor-pointer text-right overflow-hidden border transition-all duration-200 ease-out hover:-translate-y-[1px] hover:border-[var(--sidebar-hover-border)] hover:bg-[var(--sidebar-hover-bg)]/70 hover:text-[var(--sidebar-hover-fg)] hover:shadow-[0_18px_34px_-26px_rgba(15,23,42,0.35)]',
          depth === 0 ? 'rounded-[16px] px-2.5 py-1' : 'rounded-[13px] px-2 py-0.5',
          indent,
          depth === 0
            ? (
                isActiveRow
                  ? 'text-[var(--sidebar-hover-fg)] dark:text-[var(--sidebar-hover-fg-dark)]'
                  : 'border-transparent bg-transparent text-slate-600 dark:text-slate-300'
              )
            : (
                routeActive
                  ? 'text-[var(--sidebar-hover-fg)] dark:text-[var(--sidebar-hover-fg-dark)]'
                  : (branchActive
                      ? 'border-transparent bg-transparent text-slate-600 dark:text-slate-300'
                      : 'border-transparent bg-transparent text-slate-500 dark:text-slate-400')
              ),
        ].join(' ')}
        data-sidebar-active={isActiveRow ? 'true' : 'false'}
        data-sidebar-open={isOpenRow ? 'true' : 'false'}
        data-sidebar-depth={depth}
        data-sidebar-has-children={hasChildren ? 'true' : 'false'}
        title={collapsed && depth === 0 ? item.name : undefined}
        style={rowStyle}
      >
        {/* آیکون */}
        <span
          className={[
            'icon-bubble relative shrink-0 grid place-items-center transition-all duration-200 ease-out group-hover:scale-[1.05]',
            depth === 0
              ? (isActiveRow
                  ? 'rounded-xl border border-[var(--sidebar-hover-border)] bg-[var(--sidebar-hover-bg)] text-[var(--sidebar-hover-fg)] shadow-[0_14px_28px_-22px_rgba(15,23,42,0.28)]'
                  : 'rounded-xl border border-transparent bg-transparent text-current group-hover:border-[var(--sidebar-hover-border)]/70 group-hover:bg-[var(--sidebar-hover-bg)]/80')
              : (routeActive
                  ? 'rounded-lg bg-[var(--sidebar-hover-bg)] text-[var(--sidebar-hover-fg)]'
                  : (branchActive
                      ? 'rounded-lg border border-transparent bg-transparent text-slate-600 dark:text-slate-300 group-hover:bg-[var(--sidebar-hover-bg)]/70'
                      : 'rounded-lg border border-transparent bg-transparent text-current group-hover:bg-[var(--sidebar-hover-bg)]/70')),
          ].join(' ')}
          style={{ width: depth === 0 ? iconPx : Math.max(18, iconPx - 4), height: depth === 0 ? iconPx : Math.max(18, iconPx - 4) }}
        >
          {badgeCount > 0 && depth === 0 ? <span className="absolute -left-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white shadow-[0_10px_24px_-12px_rgba(244,63,94,0.65)]">{badgeCount > 99 ? '۹۹+' : badgeCount.toLocaleString('fa-IR')}</span> : null}
          {item.icon ? (
            <i
              className={[
                item.icon,
                isActiveRow
                  ? 'text-[var(--sidebar-hover-fg)] dark:text-[var(--sidebar-hover-fg-dark)]'
                  : 'text-current',
              ].join(' ')}
              style={{ fontSize: Math.max(10, Math.round(iconPx * 0.30)) }}
            />
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
          )}
        </span>

        {!collapsed && (
          <span className={[labelClass, 'sidebar-label-cell flex items-center min-w-0 flex-1'].join(' ')}>
            <span className="ux-mixed-text">{item.name}</span>
          </span>
        )}

        {/* Chevron برای گروه‌ها */}
        {hasChildren && !collapsed && (
          <i
            className={[
              'fa-solid fa-chevron-down sidebar-chevron text-[11px] opacity-70 transition-transform',
              isOpen ? 'rotate-180' : 'rotate-0',
            ].join(' ')}
          />
        )}

        {isActiveRow ? <span className="pointer-events-none absolute right-2 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-[var(--sidebar-hover-fg)] opacity-[var(--inkbar-opacity)] shadow-[0_0_14px_rgba(15,23,42,0.16)] dark:bg-[var(--sidebar-hover-fg-dark)] dark:shadow-[0_0_16px_rgba(255,255,255,0.12)]" /> : null}
      </div>
    );

    return (
      <li
        ref={(node) => { flyoutItemRefs.current[item.id] = node; }}
        data-flyout-count={item.children?.length ?? 0}
        className="relative"
        onMouseEnter={handleCollapsedEnter}
        onMouseLeave={handleCollapsedLeave}
      >
        {hasChildren ? (
          <button
            type="button"
            data-skip-global-button="true"
            onClick={onClick}
            onFocus={handleCollapsedEnter}
            className="w-full text-right"
            aria-expanded={collapsed ? showCollapsedFlyout : isOpen}
          >
            {content}
          </button>
        ) : (
          <NavLink to={item.path || '#'} onClick={onClick} className="sidebar-nav-link block">
            {content}
          </NavLink>
        )}

        {/* زیرمنو */}
        {hasChildren && !collapsed && (
          <AnimatePresence initial={false}>
            {isOpen && (
              <motion.ul
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="sidebar-submenu-list mt-1 space-y-0.5 pr-2 overflow-hidden"
                data-sidebar-submenu="true"
              >
                {item.children!.map((child) => (
                  <Row key={child.id} item={child} depth={depth + 1} parentId={item.id} />
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        )}

        {showCollapsedFlyout && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, x: 10, scale: 0.975, filter: 'blur(2px)' }}
              animate={{ opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, x: 8, scale: 0.985, filter: 'blur(1px)' }}
              transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.7 }}
              onMouseEnter={handleFlyoutPointerEnter}
              onMouseLeave={handleFlyoutPointerLeave}
              className="ux-stable-panel ux-stable-popover fixed z-[70] origin-top-right overflow-hidden rounded-[24px] border border-slate-200/80 bg-white p-2 shadow-[0_28px_70px_-30px_rgba(15,23,42,0.34)] will-change-transform dark:border-slate-800/90 dark:bg-slate-950"
              style={{ left: flyoutLayout?.left ?? 12, top: flyoutLayout?.top ?? 12, width: flyoutLayout?.width ?? 264, maxWidth: 'calc(100vw - 24px)', maxHeight: 'calc(100vh - 24px)' }}
            >
              <div className="mb-2 flex items-center gap-2 rounded-[18px] border border-slate-200/80 bg-slate-50/90 px-3 py-2 text-right dark:border-slate-800 dark:bg-slate-900/80">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-slate-200/80 bg-white text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                  <i className={item.icon || 'fa-solid fa-folder-tree'} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2"><div className="truncate text-[12px] font-extrabold text-slate-800 dark:text-slate-100">{item.name}</div><span className="nav-surface-role-pill">{getNavSurfaceRole(item).label}</span></div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">{getFlyoutSubtitle(item)}</div>
                </div>
              </div>

              <div className="max-h-[calc(100vh-132px)] space-y-1 overflow-y-auto pr-1">
                {item.path ? (
                  <NavLink
                    to={item.path}
                    onClick={() => { setHoveredGroupId(null); if (onClose) onClose(); }}
                    className={({ isActive }) => [
                      'group/flyout flex items-center gap-3 rounded-[18px] border px-3 py-2 text-right transition-all duration-200',
                      isActive
                        ? 'border-[var(--sidebar-hover-border)] bg-[var(--sidebar-hover-bg)] text-[var(--sidebar-hover-fg)] shadow-[0_16px_32px_-26px_rgba(15,23,42,0.3)]'
                        : 'border-transparent text-slate-700 hover:-translate-y-[1px] hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900 dark:hover:text-slate-50',
                    ].join(' ')}
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl border border-slate-200/80 bg-white text-slate-600 transition-all duration-200 group-hover/flyout:scale-[1.04] group-hover/flyout:border-[var(--sidebar-hover-border)] group-hover/flyout:bg-[var(--sidebar-hover-bg)] group-hover/flyout:text-[var(--sidebar-hover-fg)] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                      <i className="fa-solid fa-grid-2" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2"><span className="truncate text-[12px] font-bold">نمای کلی {item.name}</span><span className="nav-surface-role-pill hidden sm:inline-flex">{getNavSurfaceRole(item).label}</span>{badgeCount > 0 ? <span className="inline-flex min-w-[1.4rem] items-center justify-center rounded-full border border-current/10 bg-white/80 px-1.5 py-0.5 text-[10px] font-black leading-none text-current dark:bg-slate-950/70">{badgeCount.toLocaleString('fa-IR')}</span> : null}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">{getFlyoutSubtitle(item)}</div>
                    </div>
                    <i className="fa-solid fa-arrow-left text-[11px] opacity-60" />
                  </NavLink>
                ) : null}

                {item.children!.map((child) => (
                  <NavLink
                    key={child.id}
                    data-flyout-child="true"
                    to={child.path || item.path || '#'}
                    onClick={() => { setHoveredGroupId(null); if (onClose) onClose(); }}
                    className={({ isActive }) => [
                      'group/flyout flex items-center gap-3 rounded-[18px] border px-3 py-2 text-right transition-all duration-200',
                      isActive
                        ? 'border-[var(--sidebar-hover-border)] bg-[var(--sidebar-hover-bg)] text-[var(--sidebar-hover-fg)] shadow-[0_16px_32px_-26px_rgba(15,23,42,0.3)]'
                        : 'border-transparent text-slate-700 hover:-translate-y-[1px] hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900 dark:hover:text-slate-50',
                    ].join(' ')}
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl border border-slate-200/80 bg-white text-slate-600 transition-all duration-200 group-hover/flyout:scale-[1.04] group-hover/flyout:border-[var(--sidebar-hover-border)] group-hover/flyout:bg-[var(--sidebar-hover-bg)] group-hover/flyout:text-[var(--sidebar-hover-fg)] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                      {child.icon ? <i className={child.icon} /> : <i className="fa-solid fa-angle-left" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2"><span className="truncate text-[12px] font-bold">{child.name}</span><span className="nav-surface-role-pill hidden sm:inline-flex">{getNavSurfaceRole(child, item).label}</span>{getBadgeCount(child) > 0 ? <span className="inline-flex min-w-[1.4rem] items-center justify-center rounded-full border border-current/10 bg-white/80 px-1.5 py-0.5 text-[10px] font-black leading-none text-current dark:bg-slate-950/70">{getBadgeCount(child).toLocaleString('fa-IR')}</span> : null}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">{getFlyoutSubtitle(child, item)}</div>
                    </div>
                    <i className="fa-solid fa-arrow-left text-[11px] opacity-60" />
                  </NavLink>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </li>
    );
  };

  return (
    <div
      data-ui-navigation="sidebar"
      data-ui-shell="sidebar"
      data-sidebar-collapsed={collapsed ? 'true' : 'false'}
      data-sidebar-open={isOpen ? 'true' : 'false'}
      className={[
        'app-sidebar bg-white/95 dark:bg-slate-950/95 border-l border-gray-200 dark:border-slate-800 flex flex-col fixed h-full right-0 print:hidden overflow-hidden isolate backdrop-blur-xl',
        'transform transition-transform duration-300 ease-in-out',
        isOpen ? 'translate-x-0' : 'translate-x-full',
        'md:translate-x-0 md:transform-none',
        'z-[70]',
      ].join(' ')}
      // روی موبایل، سایدبار نباید از عرض صفحه بزرگ‌تر شود (به‌خصوص وقتی کاربر پهنای pill را زیاد کرده).
      // maxWidth با vw تضمین می‌کند Drawer همیشه خوش‌دست بماند.
      style={{ width: sidebarWidth, maxWidth: '86vw' }}
    >
      <div className={[
        'sidebar-brand-bar h-14 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 gap-2.5',
        collapsed ? 'px-2' : 'px-2.5',
      ].join(' ')} style={{ minHeight: 'var(--app-header-h)' }}>
        <div className="sidebar-brand-content flex items-center gap-3 min-w-0">
          {isLoadingSettings ? (
            <div className="h-9 w-9 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-xl" />
          ) : logoUrl ? (
            <img src={logoUrl} alt="لوگو" className="h-9 w-9 object-contain rounded-xl" />
          ) : (
            <div className="h-9 w-9 bg-primary/10 flex items-center justify-center rounded-xl">
              <i className="fa-solid fa-store text-primary text-base" />
            </div>
          )}
          {!collapsed && <h1 className="text-base font-bold text-slate-800 dark:text-slate-100 truncate">{storeName}</h1>}
        </div>

      </div>

      <nav className="ux-nav-compact flex-1 overflow-y-auto overflow-x-hidden py-3" data-ui-navigation-region="main">

        {/* Sidebar search (desktop) */}
        {!collapsed && (
          <div className="px-3 pb-2">
            <div className="kourosh-sidebar-search-grid app-form-field app-form-field--search app-form-field--with-leading-icon" dir="rtl" data-ui-field="true" data-ui-field-kind="sidebar-search">
              <input
                ref={sidebarSearchInputRef}
                type="text"
                value={navQuery}
                onChange={(e) => setNavQuery(e.target.value)}
                placeholder="جستجو در منو…"
                className="kourosh-sidebar-search-grid__input"
                data-sidebar-search-input="true"
                data-ui-control="true"
                data-ui-control-kind="search"
                style={{
                  all: 'unset',
                  boxSizing: 'border-box',
                  display: 'block',
                  minWidth: 0,
                  width: '100%',
                  height: 'var(--sidebar-search-h)',
                  lineHeight: 'var(--sidebar-search-h)',
                  background: 'transparent',
                  border: 0,
                  outline: 0,
                  boxShadow: 'none',
                  borderRadius: 0,
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  color: 'inherit',
                  font: 'inherit',
                  fontSize: '0.78rem',
                  fontWeight: 650,
                  direction: 'rtl',
                  textAlign: 'right',
                  padding: '0 0.55rem 0 0.15rem',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                aria-label="جستجو در منو"
              />
              <span className="kourosh-sidebar-search-grid__icon" aria-hidden="true">
                <i className="fa-solid fa-magnifying-glass" />
              </span>
            </div>
          </div>
        )}

        {!collapsed && visibleFavorites.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="px-2 pb-2"
            >
              <div className="px-2 mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-extrabold text-gray-500 dark:text-gray-400">
                  <span className="w-8 h-8 rounded-2xl border border-slate-200/80 bg-slate-50 text-slate-600 grid place-items-center shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                    <i className="fa-solid fa-star" />
                  </span>
                  علاقه‌مندی‌ها
                </div>
                <span className="text-[11px] px-2 py-1 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  {visibleFavorites.length.toLocaleString('fa-IR')}
                </span>
              </div>

              <ul className="space-y-1">
                {visibleFavorites.slice(0, 10).map((f) => {
                  const path = normalizePath(f.path);
                  const nav = findNavByPath(SIDEBAR_ITEMS, path);
                  const acc = getAccent(nav?.id ?? f.key);
                  return (
                    <li key={f.path}>
                      <NavLink
                        to={f.path}
                        className={({ isActive }) =>
                          [
                            'group relative flex items-center gap-3 px-3 py-2 rounded-2xl overflow-hidden border border-transparent transition',
                            isActive
                              ? `border border-[var(--sidebar-active-border)] bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-fg)] shadow-[var(--sidebar-active-shadow)] ring-0 dark:text-[var(--sidebar-active-fg-dark)]`
                              : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-800/60',
                          ].join(' ')
                        }
                      >
                        <span className={[
                          'w-9 h-9 rounded-2xl grid place-items-center shadow-sm',
                          'bg-white/70 dark:bg-gray-900/30',
                        ].join(' ')} style={{ minHeight: 'var(--app-header-h)' }}>
                          <i className={f.icon ?? 'fa-regular fa-star'} />
                        </span>
                        <span className="text-[12px] font-semibold truncate flex-1">{f.title}</span>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            removeFavorite(f.path);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition w-8 h-8 rounded-2xl grid place-items-center hover:bg-black/5 dark:hover:bg-white/10 text-current"
                          title="حذف مورد از علاقه‌مندی‌ها"
                          aria-label="حذف مورد از علاقه‌مندی‌ها"
                        >
                          <i className="fa-solid fa-xmark" />
                        </button>

                        {/* subtle glow */}
                        <span className={[
                          'pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition',
                          'bg-gradient-to-l from-white/0 to-white/20',
                        ].join(' ')} />
                      </NavLink>
                    </li>
                  );
                })}
              </ul>

              <div className="my-3 h-px bg-slate-200 dark:bg-slate-800" />
            </motion.div>
          )}

        <ul
          className={[
            'ux-sidebar-list',
            style.sidebarVariant === 'pill'
              ? (collapsed ? 'space-y-1 pr-2 pl-2' : 'space-y-1 pr-2.5 pl-2')
              : (collapsed ? 'space-y-1 pr-2 pl-2' : 'space-y-1 pr-2.5 pl-2'),
          ].join(' ')}
        >
          {filteredByQuery.map((item) => (
            <Row key={item.id} item={item} depth={0} />
          ))}
        </ul>
      </nav>

      {!collapsed && (
        <div className="sidebar-support-shell relative z-10 p-2 border-t border-slate-200/80 dark:border-slate-800/80">
          <div className="sidebar-support-card text-right">
            <a
              href="tel:09361583838"
              className="sidebar-support-link" data-ui-nav-action="support"
            >
              <i className="fa-solid fa-headset" />
              <span>پشتیبانی</span>
              <b dir="ltr">۰۹۳۶۱۵۸۳۸۳۸</b>
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
