import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ActionItem } from '../types';
import { apiFetch } from '../utils/apiFetch';

const priorityOrder: Record<string, number> = { High: 1, Medium: 2, Low: 3 };
const priorityLabel: Record<string, string> = { High: 'فوری', Medium: 'در انتظار اقدام', Low: 'قابل پیگیری' };
const priorityTone: Record<string, string> = { High: 'rose', Medium: 'amber', Low: 'sky' };
const iconMap: Record<string, string> = {
  StockAlert: 'fa-solid fa-box-open',
  OverdueInstallment: 'fa-solid fa-calendar-xmark',
  StagnantStock: 'fa-solid fa-snowflake',
  RepairReady: 'fa-solid fa-screwdriver-wrench',
  Default: 'fa-solid fa-bell',
};

const normalizeItems = (raw: unknown): ActionItem[] => {
  if (Array.isArray(raw)) return raw as ActionItem[];
  if (!raw || typeof raw !== 'object') return [];
  const source = raw as { items?: unknown; data?: unknown };
  if (Array.isArray(source.items)) return source.items as ActionItem[];
  if (Array.isArray(source.data)) return source.data as ActionItem[];
  return [];
};

const ActionCenterWidget: React.FC = () => {
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiFetch('/api/dashboard/action-center');
        const result = await response.json();
        if (!response.ok || result?.success === false) throw new Error(result?.message || 'خطا در دریافت مرکز عملیات');
        const sorted = normalizeItems(result?.data).sort((first, second) =>
          (priorityOrder[first.priority || 'Medium'] || 2) - (priorityOrder[second.priority || 'Medium'] || 2));
        if (alive) setActionItems(sorted);
      } catch (loadError: unknown) {
        if (alive) setError(loadError instanceof Error ? loadError.message : 'خطا در دریافت مرکز عملیات');
      } finally {
        if (alive) setIsLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const stats = useMemo(() => {
    const urgent = actionItems.filter((item) => item.priority === 'High').length;
    const pending = actionItems.filter((item) => item.priority === 'Medium').length;
    return [
      { label: 'فوری', value: urgent, tone: 'rose' },
      { label: 'در انتظار', value: pending, tone: 'amber' },
      { label: 'معمول', value: Math.max(0, actionItems.length - urgent - pending), tone: 'sky' },
    ];
  }, [actionItems]);

  return (
    <section className="app-dashboard-widget app-dashboard-action-center" data-ui-action-center="dashboard">
      <header className="app-dashboard-widget__header">
        <div className="app-dashboard-widget-header">
          <div className="app-dashboard-widget-header__identity">
            <span className="app-dashboard-widget-header__icon"><i className="fa-solid fa-bolt" /></span>
            <span className="app-dashboard-widget-header__copy">
              <strong className="app-dashboard-widget-header__title">مرکز عملیات</strong>
              <span className="app-dashboard-widget-header__subtitle">اولویت‌های قابل اقدام امروز</span>
            </span>
          </div>
          <div className="app-dashboard-status">خواندنی</div>
        </div>
      </header>

      <div className="app-dashboard-widget__body app-dashboard-widget-stack">
        <div className="app-dashboard-metric-strip" data-columns="3">
          {stats.map((stat) => (
            <div key={stat.label} className="app-dashboard-metric" data-dashboard-metric-density="compact" data-dashboard-metric-tone={stat.tone}>
              <span className="app-dashboard-metric__label">{stat.label}</span>
              <strong className="app-dashboard-metric__value">{stat.value.toLocaleString('fa-IR')}</strong>
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="app-dashboard-loading"><i className="fa-solid fa-spinner fa-spin" /><span>در حال دریافت…</span></div>
        ) : error ? (
          <div className="app-dashboard-state" data-tone="rose"><strong>دریافت مرکز عملیات انجام نشد</strong><small>{error}</small></div>
        ) : actionItems.length === 0 ? (
          <div className="app-dashboard-state" data-tone="emerald"><strong>همه چیز تحت کنترل است</strong><small>فعلاً اقدام ضروری ثبت نشده است.</small></div>
        ) : (
          <div className="app-dashboard-list">
            {actionItems.map((item) => {
              const priority = item.priority || 'Low';
              const to = item.actionLink?.startsWith('/') ? item.actionLink : `/${item.actionLink || ''}`;
              return (
                <article key={item.id} className="app-dashboard-list-row" data-action-priority={priority}>
                  <span className="app-dashboard-list-row__icon" data-tone={priorityTone[priority] || 'neutral'}>
                    <i className={iconMap[item.type] || iconMap.Default} />
                  </span>
                  <span className="app-dashboard-list-row__content">
                    <span className="app-dashboard-list-row__title">{item.title}</span>
                    <span className="app-dashboard-list-row__description">{item.description}</span>
                  </span>
                  <span className="app-dashboard-status" data-tone={priorityTone[priority] || 'neutral'}>{priorityLabel[priority] || 'پیگیری'}</span>
                  {to && item.actionText ? <Link to={to} className="app-dashboard-row-link" aria-label={item.actionText}><i className="fa-solid fa-chevron-left" /></Link> : null}
                </article>
              );
            })}
          </div>
        )}

        <nav className="app-dashboard-action-links" aria-label="دسترسی‌های مرکز عملیات">
          <Link to="/customers"><i className="fa-solid fa-users" /><span>مشتریان</span></Link>
          <Link to="/installment-sales"><i className="fa-solid fa-file-invoice-dollar" /><span>فروش اقساطی</span></Link>
          <Link to="/reports/financial-overview"><i className="fa-solid fa-chart-line" /><span>نمای مالی</span></Link>
        </nav>
      </div>
    </section>
  );
};

export default ActionCenterWidget;
