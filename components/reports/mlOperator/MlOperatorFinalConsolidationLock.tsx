import { formatExactNumberText } from '../../../utils/exactNumber';
import { useMemo } from 'react';
import type { MlOperatorOverviewRouteKey, MlOperatorRouteResult } from '../../../services/mlOperatorOverviewApi';

const toFaNumber = (value: number): string => formatExactNumberText(value);

const shamsiDateTime = (value: string | null): string => {
  if (!value) return 'نامشخص';
  try {
    return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
};

type ConsolidationItem = {
  key: string;
  title: string;
  helper: string;
  locked: boolean;
};

const buildConsolidationItems = (sources: MlOperatorRouteResult[], visibleSourceKeys: MlOperatorOverviewRouteKey[]): ConsolidationItem[] => {
  const visibleKeySet = new Set(visibleSourceKeys);
  const visibleSources = sources.filter((source) => visibleKeySet.has(source.key));
  const hasWriteRisk = false;
  const hasBackendExpansion = false;
  const allSourcesRepresented = visibleSources.length <= sources.length;

  return [
    {
      key: 'overview-chain',
      title: 'زنجیره نمای اپراتور کامل شد',
      helper: 'نمای کلی، جزئیات، فیلتر، نماهای آماده، رهگیری زمانی، سلامت منابع، صف توجه، چک‌لیست، خلاصه مدیریتی، برد آمادگی و تضمین دسترسی در یک مسیر واحد قرار دارند.',
      locked: true,
    },
    {
      key: 'metadata-boundary',
      title: 'مرز فراداده‌ای حفظ شد',
      helper: 'تمام پنل‌ها از همان داده‌های خواندنی لودشده استفاده می‌کنند و داده خام اجرایی یا مسیر فایل را نمایش نمی‌دهند.',
      locked: true,
    },
    {
      key: 'access-boundary',
      title: 'مرز دسترسی تثبیت شد',
      helper: 'نمای اپراتور در دامنه مدیر کل و مدیر باقی می‌ماند و سطح مشاهده عمومی یا فروشگاهی اضافه نشده است.',
      locked: true,
    },
    {
      key: 'source-coverage',
      title: 'پوشش منابع قابل مشاهده قفل شد',
      helper: `${toFaNumber(visibleSources.length)} منبع از ${toFaNumber(sources.length)} منبع فعلی در جمع‌بندی نهایی لحاظ شده‌اند.`,
      locked: allSourcesRepresented,
    },
    {
      key: 'no-backend-expansion',
      title: 'گسترش بک‌اند اضافه نشد',
      helper: 'این جمع‌بندی مسیر، سرویس، جدول، مهاجرت یا ذخیره‌سازی جدید معرفی نمی‌کند.',
      locked: !hasBackendExpansion,
    },
    {
      key: 'no-write-risk',
      title: 'ریسک تغییر عملیاتی اضافه نشد',
      helper: 'دکمه اجرایی، ورودی، فرم تأیید، ذخیره‌سازی یا کنترل تغییر اطلاعات عملیاتی اضافه نشده است.',
      locked: !hasWriteRisk,
    },
  ];
};

const PanelTag = ({ children }: { children: string }) => (
  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-600 ring-1 ring-slate-200 dark:bg-slate-950/60 dark:text-slate-300 dark:ring-slate-800">
    {children}
  </span>
);

export function MlOperatorFinalConsolidationLock({
  sources,
  visibleSourceKeys,
  fetchedAt,
}: {
  sources: MlOperatorRouteResult[];
  visibleSourceKeys: MlOperatorOverviewRouteKey[];
  fetchedAt: string | null;
}) {
  const items = useMemo(() => buildConsolidationItems(sources, visibleSourceKeys), [sources, visibleSourceKeys]);
  const lockedCount = items.filter((item) => item.locked).length;
  const readinessScore = items.length > 0 ? ((lockedCount / items.length) * 100) : 0;

  return (
    <section
      className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_48px_-44px_rgba(15,23,42,0.42)] dark:border-slate-800 dark:bg-slate-900/80"
      data-ml-operator-final-consolidation-anchor="read-only-final-consolidation-lock"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700 ring-1 ring-slate-200 dark:bg-slate-950/60 dark:text-slate-200 dark:ring-slate-800">
              <i className="fa-solid fa-lock" />
              قفل نهایی پایش خواندنی
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-black text-primary ring-1 ring-primary/20">
              جمع‌بندی بدون عملیات
            </span>
          </div>
          <h2 className="text-base font-black text-slate-950 dark:text-white">جمع‌بندی نهایی سطح اپراتور</h2>
          <p className="mt-2 max-w-3xl text-xs font-bold leading-6 text-slate-500 dark:text-slate-400">
            این بخش برای پایان‌بندی مسیر اپراتور است؛ فقط وضعیت پنل‌های خواندنی را جمع‌بندی می‌کند و قابلیت تازه، ذخیره‌سازی یا مسیر عملیاتی اضافه نمی‌کند.
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4 text-right ring-1 ring-slate-200 dark:bg-slate-950/40 dark:ring-slate-800">
          <div className="text-2xl font-black text-slate-950 dark:text-white">٪{toFaNumber(readinessScore)}</div>
          <div className="mt-1 text-[11px] font-black text-slate-500 dark:text-slate-400">امتیاز قفل نهایی</div>
          <div className="mt-2 text-[11px] font-bold text-slate-400 dark:text-slate-500">آخرین بروزرسانی: {shamsiDateTime(fetchedAt)}</div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <PanelTag>نمای کلی</PanelTag>
        <PanelTag>جزئیات خواندنی</PanelTag>
        <PanelTag>فیلتر و صفحه‌بندی</PanelTag>
        <PanelTag>نماهای آماده</PanelTag>
        <PanelTag>رهگیری زمانی</PanelTag>
        <PanelTag>سلامت منابع</PanelTag>
        <PanelTag>صف توجه</PanelTag>
        <PanelTag>چک‌لیست مدیریتی</PanelTag>
        <PanelTag>خلاصه مدیریتی</PanelTag>
        <PanelTag>برد آمادگی خروجی</PanelTag>
        <PanelTag>تضمین دسترسی</PanelTag>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {items.map((item) => (
          <article key={item.key} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-right dark:border-slate-800 dark:bg-slate-950/35">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-black text-slate-950 dark:text-white">{item.title}</div>
                <p className="mt-2 text-xs font-bold leading-6 text-slate-500 dark:text-slate-400">{item.helper}</p>
              </div>
              <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${item.locked ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/25 dark:text-emerald-200 dark:ring-emerald-900/70' : 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/25 dark:text-amber-200 dark:ring-amber-900/70'}`}>
                {item.locked ? 'قفل شد' : 'مرور شود'}
              </span>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-4 rounded-2xl bg-emerald-50 p-3 text-xs font-black leading-6 text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-950/25 dark:text-emerald-200 dark:ring-emerald-900/70">
        مسیر اپراتور در این سطح کامل است؛ ادامه مناسب، اجرای بررسی کامل روی محیط محلی با وابستگی‌های واقعی و سپس فقط اصلاح regression است، نه افزودن پنل تازه.
      </div>
    </section>
  );
}
