import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ActionItem } from '../types';
import { apiFetch } from '../utils/apiFetch';

const priorityOrder: Record<string, number> = { High: 1, Medium: 2, Low: 3 };
const priorityTone: Record<string, { chip: string; glow: string; label: string }> = {
  High: {
    chip: 'border-rose-200 bg-rose-50 text-rose-700',
    glow: 'from-rose-500/20 via-rose-500/5 to-transparent',
    label: 'فوری',
  },
  Medium: {
    chip: 'border-amber-200 bg-amber-50 text-amber-700',
    glow: 'from-amber-500/20 via-amber-500/5 to-transparent',
    label: 'در انتظار اقدام',
  },
  Low: {
    chip: 'border-sky-200 bg-sky-50 text-sky-700',
    glow: 'from-sky-500/20 via-sky-500/5 to-transparent',
    label: 'قابل پیگیری',
  },
};

function normalizeItems(raw: any): ActionItem[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as ActionItem[];
  if (Array.isArray(raw.items)) return raw.items as ActionItem[];
  if (raw.data && Array.isArray(raw.data)) return raw.data as ActionItem[];
  return [];
}

const iconMap: Record<string, { icon: string; badge: string; accent: string }> = {
  StockAlert: {
    icon: 'fa-solid fa-box-open',
    badge: 'bg-gradient-to-br from-rose-500 to-red-600 text-white',
    accent: 'border-rose-200/80',
  },
  OverdueInstallment: {
    icon: 'fa-solid fa-calendar-xmark',
    badge: 'bg-gradient-to-br from-rose-500 to-pink-600 text-white',
    accent: 'border-rose-200/80',
  },
  StagnantStock: {
    icon: 'fa-solid fa-snowflake',
    badge: 'bg-gradient-to-br from-amber-400 to-orange-500 text-white',
    accent: 'border-amber-200/80',
  },
  RepairReady: {
    icon: 'fa-solid fa-screwdriver-wrench',
    badge: 'bg-gradient-to-br from-sky-500 to-indigo-600 text-white',
    accent: 'border-sky-200/80',
  },
  Default: {
    icon: 'fa-solid fa-bell',
    badge: 'bg-gradient-to-br from-slate-700 to-slate-900 text-white',
    accent: 'border-slate-200/80',
  },
};

const ActionCenterWidget: React.FC = () => {
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const fetchActionItems = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiFetch('/api/dashboard/action-center');
        const result = await response.json();

        if (!response.ok || result?.success === false) {
          throw new Error(result?.message || 'خطا در دریافت اطلاعات مرکز عملیات');
        }

        const items = normalizeItems(result?.data);
        const sorted = [...items].sort((a: ActionItem, b: ActionItem) => {
          const pa = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2;
          const pb = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2;
          return pa - pb;
        });

        if (alive) setActionItems(sorted);
      } catch (err: any) {
        if (alive) setError(err?.message || 'خطا در دریافت اطلاعات مرکز عملیات');
      } finally {
        if (alive) setIsLoading(false);
      }
    };

    fetchActionItems();
    return () => {
      alive = false;
    };
  }, []);

  const stats = useMemo(() => {
    const urgent = actionItems.filter((item) => item.priority === 'High').length;
    const pending = actionItems.filter((item) => item.priority === 'Medium').length;
    const routine = Math.max(0, actionItems.length - urgent - pending);
    return [
      { label: 'اقدام فوری', value: urgent, tone: 'text-rose-600' },
      { label: 'در صف اجرا', value: pending, tone: 'text-amber-600' },
      { label: 'پیگیری معمول', value: routine, tone: 'text-sky-600' },
    ];
  }, [actionItems]);

  const renderBody = () => {
    if (isLoading) {
      return (
        <div className="space-y-3 p-4 sm:p-5">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_20px_40px_-34px_rgba(15,23,42,0.22)]">
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 animate-pulse rounded-2xl bg-slate-200/80" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 animate-pulse rounded-full bg-slate-200/80" />
                  <div className="h-3 w-full animate-pulse rounded-full bg-slate-100" />
                  <div className="h-3 w-2/3 animate-pulse rounded-full bg-slate-100" />
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-5">
          <div className="rounded-[26px] border border-rose-200 bg-rose-50/80 p-5 text-right text-rose-700 shadow-[0_20px_40px_-34px_rgba(225,29,72,0.26)]">
            <div className="mb-2 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
              <i className="fa-solid fa-triangle-exclamation" />
            </div>
            <p className="text-sm font-black">در دریافت مرکز عملیات خطایی رخ داد</p>
            <p className="mt-2 text-sm leading-7 text-rose-600/90">{error}</p>
          </div>
        </div>
      );
    }

    if (!actionItems.length) {
      return (
        <div className="p-5">
          <div className="rounded-[30px] border border-emerald-200/80 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.18),transparent_55%),linear-gradient(180deg,#ffffff,#f8fffb)] p-6 text-center shadow-[0_30px_60px_-42px_rgba(16,185,129,0.34)] dark:border-emerald-900/40 dark:bg-slate-950">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[26px] bg-gradient-to-br from-emerald-500 to-emerald-600 text-2xl text-white shadow-[0_20px_40px_-26px_rgba(16,185,129,0.55)]">
              <i className="fa-solid fa-circle-check" />
            </div>
            <h4 className="text-base font-black text-slate-900 dark:text-white">همه چیز تحت کنترل است</h4>
            <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">فعلاً کار ضروری برای امروز ثبت نشده و داشبورد در وضعیت پایدار قرار دارد.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3 p-4 sm:p-5" data-ui-action-center-list="true">
        {actionItems.map((item) => {
          const tone = priorityTone[item.priority || 'Low'] || priorityTone.Low;
          const icon = iconMap[item.type] || iconMap.Default;
          const to = item.actionLink?.startsWith('/') ? item.actionLink : `/${item.actionLink ?? ''}`;
          return (
            <article
              key={item.id}
              className={`action-center-item group relative overflow-hidden rounded-[28px] border bg-white p-4 shadow-[0_24px_54px_-42px_rgba(15,23,42,0.24)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_28px_58px_-40px_rgba(15,23,42,0.3)] dark:bg-slate-950 ${icon.accent}`} data-ui-action-center-item="true" data-action-priority={item.priority || 'Low'} data-action-type={item.type || 'Default'}
            >
              <div className={`pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b ${tone.glow}`} />
              <div className="relative flex items-start gap-3">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] text-lg shadow-[0_16px_34px_-22px_rgba(15,23,42,0.4)] ${icon.badge}`}>
                  <i className={icon.icon} />
                </div>
                <div className="min-w-0 flex-1 text-right">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">{item.title}</h4>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black ${tone.chip}`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
                      {tone.label}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">{item.description}</p>
                  {to && item.actionText ? (
                    <div className="mt-4 flex justify-end">
                      <Link to={to} className="ux-btn ux-btn-primary ux-btn-sm ux-btn-chip app-command-button" data-ui-action-center-command="open">
                        <i className="fa-solid fa-arrow-left-long" />
                        {item.actionText}
                      </Link>
                    </div>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    );
  };

  return (
    <div className="action-center-foundation overflow-hidden rounded-[32px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] shadow-[0_34px_74px_-52px_rgba(15,23,42,0.34)] dark:border-slate-800 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.96))]" data-ui-action-center="dashboard" data-action-center-empty={actionItems.length === 0 ? 'true' : 'false'}>
      <div className="border-b border-slate-200/80 p-4 text-right dark:border-slate-800 sm:p-5" data-ui-action-center-header="true">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[24px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-white shadow-[0_22px_42px_-28px_rgba(15,23,42,0.58)]">
              <i className="fa-solid fa-wave-square text-xl" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </span>
                مانیتورینگ لحظه‌ای داشبورد
              </div>
              <h3 className="mt-3 text-lg font-black text-slate-900 dark:text-slate-100">مرکز عملیات و کارهای روز</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">اولویت‌های امروز را همین‌جا ببین، سریع تفکیک کن و مستقیم وارد اقدام شو.</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {stats.map((stat) => (
              <div key={stat.label} className="action-center-stat rounded-[22px] border border-slate-200/80 bg-white/90 px-3 py-3 text-center shadow-[0_18px_34px_-30px_rgba(15,23,42,0.24)] dark:border-slate-800 dark:bg-slate-900" data-ui-action-center-stat="true">
                <div className={`text-lg font-black ${stat.tone}`}>{stat.value.toLocaleString('fa-IR')}</div>
                <div className="mt-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-slate-200/80 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-950/50 sm:p-5" data-ui-action-center-shortcuts="true">
        <div className="grid gap-3 md:grid-cols-3">
          <Link to="/customers" className="ux-quick-link ux-quick-link--emerald">
            <span className="ux-quick-link__icon"><i className="fa-solid fa-users" /></span>
            <span className="ux-quick-link__body">
              <strong className="ux-quick-link__title">مشتریان</strong>
              <span className="ux-quick-link__desc">لیست مشتریان و پیگیری بدهی‌ها</span>
            </span>
            <span className="ux-quick-link__arrow" aria-hidden="true"><i className="fa-solid fa-arrow-left" /></span>
          </Link>
          <Link to="/installment-sales" className="ux-quick-link ux-quick-link--blue">
            <span className="ux-quick-link__icon"><i className="fa-solid fa-file-invoice-dollar" /></span>
            <span className="ux-quick-link__body">
              <strong className="ux-quick-link__title">فروش اقساطی</strong>
              <span className="ux-quick-link__desc">ثبت اطلاعات سریع و مدیریت سررسیدها</span>
            </span>
            <span className="ux-quick-link__arrow" aria-hidden="true"><i className="fa-solid fa-arrow-left" /></span>
          </Link>
          <Link to="/reports/financial-overview" className="ux-quick-link ux-quick-link--violet">
            <span className="ux-quick-link__icon"><i className="fa-solid fa-chart-line" /></span>
            <span className="ux-quick-link__body">
              <strong className="ux-quick-link__title">نمای مالی</strong>
              <span className="ux-quick-link__desc">نمای کلی مالی و دسترسی سریع به شاخص‌های فروش</span>
            </span>
            <span className="ux-quick-link__arrow" aria-hidden="true"><i className="fa-solid fa-arrow-left" /></span>
          </Link>
        </div>
      </div>
      {renderBody()}
    </div>
  );
};

export default ActionCenterWidget;
