import React, { useEffect, useLayoutEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@/components/ui';
import { canAccessNavigationPath, type NavigationFeatureFlags } from '../../utils/navigationPolicy';
import type { CurrencyUnit } from '../../utils/currency';
import type { FontAwesomeIconClass } from '../../types/iconMetadata';
import HeaderQuickPopover from './HeaderQuickPopover';
import { formatReportPercentText } from '../../utils/reportPresentation';
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
  tooltip: string;
  destinationLabel: string;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

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
  const [activeQuickMenu, setActiveQuickMenu] = useState<HeaderQuickMenuKey | null>(null);
  const quickMenuButtonRefs = useRef<Record<HeaderQuickMenuKey, HTMLDivElement | null>>({
    sales: null,
    due: null,
    notifications: null,
  });
  const [quickMenuPosition, setQuickMenuPosition] = useState<Record<HeaderQuickMenuKey, HeaderQuickMenuSmartStyle>>({
    sales: {},
    due: {},
    notifications: {},
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (quickActionsRef.current && !quickActionsRef.current.contains(event.target as Node)) {
        setActiveQuickMenu(null);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveQuickMenu(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    if (activeQuickMenu === 'due' || activeQuickMenu === 'notifications') {
      refreshHeaderQuickPanels();
    }
  }, [activeQuickMenu, refreshHeaderQuickPanels]);

  useLayoutEffect(() => {
    if (!activeQuickMenu || typeof window === 'undefined') return;

    const updateQuickMenuPosition = () => {
      const node = quickMenuButtonRefs.current[activeQuickMenu];
      if (!node) return;

      const viewportPadding = 12;
      const desiredWidth = activeQuickMenu === 'sales' ? 332 : 318;
      const panelWidth = Math.min(desiredWidth, window.innerWidth - viewportPadding * 2);
      const preferredHeight = activeQuickMenu === 'sales' ? 450 : 350;
      const gap = 8;
      const rect = node.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
      const spaceAbove = rect.top - viewportPadding;
      const openBelow = spaceBelow >= 220 || spaceBelow >= spaceAbove;
      const availableHeight = (openBelow ? spaceBelow : spaceAbove) - gap;
      const maxHeight = Math.max(180, Math.min(preferredHeight, availableHeight));
      const top = openBelow
        ? clamp(rect.bottom + gap, viewportPadding, window.innerHeight - viewportPadding - maxHeight)
        : clamp(rect.top - gap - maxHeight, viewportPadding, window.innerHeight - viewportPadding - maxHeight);
      const maxLeft = Math.max(viewportPadding, window.innerWidth - viewportPadding - panelWidth);
      const safeLeft = clamp(rect.left, viewportPadding, maxLeft);

      setQuickMenuPosition((current) => ({
        ...current,
        [activeQuickMenu]: {
          position: 'fixed',
          top: Math.round(top),
          left: Math.round(safeLeft),
          right: 'auto',
          width: Math.round(panelWidth),
          maxHeight: Math.round(maxHeight),
          transformOrigin: `${Math.round(rect.left + rect.width / 2 - safeLeft)}px ${openBelow ? '0px' : '100%'}`,
          '--header-quick-panel-origin-x': `${Math.round(rect.left + rect.width / 2 - safeLeft)}px`,
          '--header-quick-panel-origin-y': openBelow ? '0px' : '100%',
        },
      }));
    };

    updateQuickMenuPosition();
    window.addEventListener('resize', updateQuickMenuPosition);
    window.addEventListener('scroll', updateQuickMenuPosition, true);
    return () => {
      window.removeEventListener('resize', updateQuickMenuPosition);
      window.removeEventListener('scroll', updateQuickMenuPosition, true);
    };
  }, [
    activeQuickMenu,
    headerQuickLoading,
    headerQuickStats.salesCount,
    headerQuickStats.dueCount,
    headerQuickStats.notificationsCount,
  ]);

  const headerQuickActionsRaw: HeaderQuickActionConfig[] = [
    {
      key: 'sales',
      to: '/reports',
      label: 'فروش امروز',
      icon: 'fa-solid fa-bag-shopping',
      count: headerQuickStats.salesCount,
      tooltip: 'پیش‌نمایش فروش امروز',
      destinationLabel: 'مشاهده گزارش فروش',
    },
    {
      key: 'due',
      to: '/reports/installments-calendar',
      label: 'سررسیدها',
      icon: 'fa-solid fa-hourglass-half',
      count: headerQuickStats.dueCount,
      tooltip: 'سررسیدهای نزدیک',
      destinationLabel: 'مشاهده تقویم سررسید',
    },
    {
      key: 'notifications',
      to: '/notifications',
      label: 'اعلان‌ها',
      icon: 'fa-solid fa-bell',
      count: headerQuickStats.notificationsCount,
      tooltip: 'اعلان‌های اخیر',
      destinationLabel: 'مشاهده همه اعلان‌ها',
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
      title: 'فروش امروز',
      subtitle: headerQuickPanels.sales.totalTransactions > 0
        ? `${headerQuickPanels.sales.totalTransactions.toLocaleString('fa-IR')} فاکتور ثبت شده`
        : 'امروز هنوز فروشی ثبت نشده است',
    },
    due: {
      title: 'سررسیدهای نزدیک',
      subtitle: headerQuickPanels.due.length > 0 ? 'سه مورد اول برای اقدام سریع' : 'موردی برای نمایش وجود ندارد',
    },
    notifications: {
      title: 'اعلان‌های اخیر',
      subtitle: headerQuickPanels.notifications.length > 0 ? 'آخرین موارد نیازمند توجه' : 'اعلانی برای نمایش وجود ندارد',
    },
  } as const;

  const renderLoading = () => (
    <div className="app-header-popover__loading" aria-label="در حال دریافت اطلاعات">
      {Array.from({ length: 3 }).map((_, index) => (
        <span key={index} className="app-header-popover__loading-line" />
      ))}
    </div>
  );

  const renderSalesPanel = () => (
    <div className="app-header-popover__content">
      <section className="app-header-popover__currency">
        <div>
          <div className="app-header-popover__section-title">واحد نمایش مبلغ</div>
          <div className="app-header-popover__section-hint">تومان یا ریال</div>
        </div>
        <div className="app-header-popover__segments" role="group" aria-label="واحد نمایش مبلغ">
          {([
            { key: 'toman', label: 'تومان' },
            { key: 'rial', label: 'ریال' },
          ] as const).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setHeaderCurrencyUnit(item.key)}
              className="app-header-popover__segment"
              data-selected={headerCurrencyUnit === item.key ? 'true' : 'false'}
              aria-pressed={headerCurrencyUnit === item.key}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section className="app-header-popover__summary-grid" aria-label="خلاصه فروش امروز">
        <div className="app-header-popover__metric">
          <span className="app-header-popover__metric-label">فروش امروز</span>
          <strong className="app-header-popover__metric-value">{formatMoney(headerQuickPanels.sales.totalRevenue)}</strong>
        </div>
        <div className="app-header-popover__metric">
          <span className="app-header-popover__metric-label">میانگین فاکتور</span>
          <strong className="app-header-popover__metric-value">{formatMoney(headerQuickPanels.sales.averageSaleValue)}</strong>
        </div>
      </section>

      {isFeatureEnabled('advanced_reports') ? (
        <section className="app-header-popover__section">
          <div className="app-header-popover__section-heading">
            <span className="app-header-popover__section-title">
              <FontAwesomeIcon icon="fa-solid fa-chart-simple" /> نبض مالی ماه
            </span>
            <Link to="/reports/financial-overview" onClick={() => setActiveQuickMenu(null)} className="app-header-popover__section-link">
              نمای مالی
            </Link>
          </div>
          <div className="app-header-popover__finance-grid">
            <div>
              <span>سود تحقق‌یافته</span>
              <strong data-tooltip={headerFinancePulse.available ? formatMoney(headerFinancePulse.realizedProfit) : undefined}>{headerFinancePulse.available ? formatMoneyPreview(headerFinancePulse.realizedProfit) : '—'}</strong>
              <small>{headerFinancePulse.available ? headerCurrencyLabel : 'داده در دسترس نیست'}</small>
            </div>
            <div>
              <span>نرخ وصول</span>
              <strong>{headerFinancePulse.available ? formatReportPercentText(headerFinancePulse.collectionRate) : '—'}</strong>
              <small>{headerFinancePulse.available ? 'ماه جاری' : 'داده در دسترس نیست'}</small>
            </div>
            <div>
              <span>وصول واقعی</span>
              <strong data-tooltip={headerFinancePulse.available ? formatMoney(headerFinancePulse.realizedRevenue) : undefined}>{headerFinancePulse.available ? formatMoneyPreview(headerFinancePulse.realizedRevenue) : '—'}</strong>
              <small>{headerFinancePulse.available ? headerCurrencyLabel : 'داده در دسترس نیست'}</small>
            </div>
          </div>
        </section>
      ) : null}

      <section className="app-header-popover__section">
        <div className="app-header-popover__section-title">پرفروش‌ترین‌های امروز</div>
        {headerQuickPanels.sales.topSellingItems.length ? (
          <div className="app-header-popover__list">
            {headerQuickPanels.sales.topSellingItems.slice(0, 4).map((item, index) => (
              <div key={`${item.itemName || 'item'}-${index}`} className="app-header-popover__list-item">
                <div className="app-header-popover__list-main">
                  <strong className="app-header-popover__list-title">{item.itemName || 'آیتم بدون عنوان'}</strong>
                  <span className="app-header-popover__list-meta">{Number(item.quantitySold || 0).toLocaleString('fa-IR')} فروش</span>
                </div>
                <span className="app-header-popover__list-value">{formatMoney(item.totalRevenue)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="app-header-popover__empty">برای امروز هنوز آیتم فروخته‌شده‌ای ثبت نشده است.</div>
        )}
      </section>
    </div>
  );

  const renderDuePanel = () => (
    <div className="app-header-popover__content">
      {headerQuickPanels.due.length ? (
        <div className="app-header-popover__list">
          {headerQuickPanels.due.slice(0, 3).map((item, index) => (
            <Link
              key={`${item.saleId || 'due'}-${index}`}
              to={item.saleId ? `/installment-sales/${item.saleId}` : '/reports/installments-calendar'}
              onClick={() => setActiveQuickMenu(null)}
              className="app-header-popover__list-item app-header-popover__list-item--link"
            >
              <div className="app-header-popover__list-main">
                <strong className="app-header-popover__list-title">{item.customerFullName || 'مشتری بدون نام'}</strong>
                <span className="app-header-popover__list-meta">
                  {item.dueDate || 'بدون تاریخ'}
                  {item.status ? <em>{item.status}</em> : null}
                </span>
              </div>
              <span className="app-header-popover__list-value app-header-popover__list-value--danger">{formatMoney(item.amount)}</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="app-header-popover__empty">در حال حاضر سررسید بازی برای نمایش وجود ندارد.</div>
      )}
    </div>
  );

  const renderNotificationsPanel = () => (
    <div className="app-header-popover__content">
      {headerQuickPanels.notifications.length ? (
        <div className="app-header-popover__list">
          {headerQuickPanels.notifications.slice(0, 3).map((item) => (
            <Link
              key={item.id}
              to={item.actionLink || '/notifications'}
              onClick={() => setActiveQuickMenu(null)}
              className="app-header-popover__list-item app-header-popover__list-item--link"
            >
              <div className="app-header-popover__list-main">
                <strong className="app-header-popover__list-title">{item.title || 'اعلان'}</strong>
                <span className="app-header-popover__list-meta app-header-popover__list-meta--wrap">
                  {item.description || 'برای مشاهده جزئیات وارد مرکز اعلان‌ها شوید.'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="app-header-popover__empty">اعلان مهمی برای نمایش وجود ندارد.</div>
      )}
    </div>
  );

  const renderPanelContent = (key: HeaderQuickMenuKey) => {
    if (headerQuickLoading) return renderLoading();
    if (key === 'sales') return renderSalesPanel();
    if (key === 'due') return renderDuePanel();
    return renderNotificationsPanel();
  };

  return (
    <div ref={quickActionsRef} className="app-header-live-actions" data-ui-header-live-actions="true">
      {headerQuickActions.map((action) => {
        const isOpen = activeQuickMenu === action.key;
        const visibleCount = action.count > 99 ? '۹۹+' : action.count.toLocaleString('fa-IR');
        const summary = quickActionSummaries[action.key];

        return (
          <div
            key={action.key}
            ref={(node) => { quickMenuButtonRefs.current[action.key] = node; }}
            className="app-header-live-action-wrap"
            data-header-live-action-key={action.key}
            data-header-alert-active={action.count > 0 ? 'true' : 'false'}
          >
            <button
              type="button"
              data-skip-global-button="true"
              data-action-key={action.key}
              data-active={isOpen ? 'true' : 'false'}
              data-header-alert-count={action.count}
              aria-expanded={isOpen}
              aria-haspopup="dialog"
              aria-label={`${action.label}${action.count > 0 ? `، ${visibleCount} مورد` : ''}`}
              className="app-header-live-action"
              onClick={() => setActiveQuickMenu(isOpen ? null : action.key)}
              data-tooltip={action.tooltip}
            >
              <FontAwesomeIcon icon={action.icon} className="app-header-live-action__icon" />
              {!headerQuickLoading && action.count > 0 ? (
                <span className="app-header-live-action__count">{visibleCount}</span>
              ) : null}
            </button>

            {isOpen ? (
              <HeaderQuickPopover
                menuKey={action.key}
                title={summary.title}
                subtitle={summary.subtitle}
                icon={action.icon}
                destination={action.to}
                destinationLabel={action.destinationLabel}
                position={quickMenuPosition[action.key]}
                onClose={() => setActiveQuickMenu(null)}
              >
                {renderPanelContent(action.key)}
              </HeaderQuickPopover>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

export default HeaderQuickActions;
