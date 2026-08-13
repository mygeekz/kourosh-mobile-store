import { formatExactNumberText } from '../../../utils/exactNumber';
import { IconGlyph } from '@/components/ui';
import type { MlOperatorOverviewRouteKey } from '../../../services/mlOperatorOverviewApi';
import type { MlOperatorSourceFilter, MlOperatorStatusFilter } from './MlOperatorFilterToolbar';

export type MlOperatorSavedViewKey = 'allReadable' | 'readySources' | 'emptySources' | 'comparisonOnly' | 'packageOnly' | 'receiptExportsOnly';

export type MlOperatorSavedViewConfig = {
  key: MlOperatorSavedViewKey;
  label: string;
  description: string;
  icon: string;
  query: string;
  statusFilter: MlOperatorStatusFilter;
  sourceFilter: MlOperatorSourceFilter;
  pageSize: number;
};

const sourceLabels: Record<MlOperatorSourceFilter, string> = {
  all: 'همه بخش‌ها',
  comparisonSummaries: 'مقایسه‌ها',
  importReceipts: 'رسیدهای ورود',
  receiptExports: 'خروجی رسیدها',
  exportPackages: 'بسته‌های خروجی',
  packageSnapshots: 'اسنپ‌شات‌ها',
};

const statusLabels: Record<MlOperatorStatusFilter, string> = {
  all: 'همه وضعیت‌ها',
  ready: 'دارای داده',
  empty: 'خالی',
  unauthorized: 'محدود دسترسی',
  unavailable: 'در دسترس نیست',
  error: 'دارای خطا',
};

export const ML_OPERATOR_SAVED_VIEW_CONFIGS: MlOperatorSavedViewConfig[] = [
  {
    key: 'allReadable',
    label: 'نمای کامل خواندنی',
    description: 'بازگشت به همه منابع فراداده با تعداد ردیف استاندارد.',
    icon: 'fa-border-all',
    query: '',
    statusFilter: 'all',
    sourceFilter: 'all',
    pageSize: 3,
  },
  {
    key: 'readySources',
    label: 'منابع دارای داده',
    description: 'تمرکز روی بخش‌هایی که رکورد قابل مشاهده برگردانده‌اند.',
    icon: 'fa-circle-check',
    query: '',
    statusFilter: 'ready',
    sourceFilter: 'all',
    pageSize: 5,
  },
  {
    key: 'emptySources',
    label: 'منابع خالی',
    description: 'بررسی مسیرهایی که پاسخ سالم دارند اما رکوردی ندارند.',
    icon: 'fa-inbox',
    query: '',
    statusFilter: 'empty',
    sourceFilter: 'all',
    pageSize: 3,
  },
  {
    key: 'comparisonOnly',
    label: 'ممیزی مقایسه‌ها',
    description: 'نمای محدود برای خلاصه‌های مقایسه کاندید و مبنا.',
    icon: 'fa-scale-balanced',
    query: '',
    statusFilter: 'all',
    sourceFilter: 'comparisonSummaries',
    pageSize: 5,
  },
  {
    key: 'packageOnly',
    label: 'ممیزی بسته‌ها',
    description: 'تمرکز روی بسته‌های خروجی و هش‌های قابل تطبیق.',
    icon: 'fa-box-archive',
    query: '',
    statusFilter: 'all',
    sourceFilter: 'exportPackages',
    pageSize: 5,
  },
  {
    key: 'receiptExportsOnly',
    label: 'ممیزی خروجی رسیدها',
    description: 'نمای محدود برای خروجی رسیدها و ارتباط آن‌ها با بسته‌های داخلی.',
    icon: 'fa-file-export',
    query: '',
    statusFilter: 'all',
    sourceFilter: 'receiptExports',
    pageSize: 5,
  },
];

const routeLabel = (value: MlOperatorOverviewRouteKey): string => sourceLabels[value] || 'بخش خواندنی';

export function MlOperatorSavedViewsPanel({
  activeViewKey,
  query,
  statusFilter,
  sourceFilter,
  pageSize,
  totalSectionCount,
  filteredSectionCount,
  returnedItems,
  onSelectView,
}: {
  activeViewKey: MlOperatorSavedViewKey | null;
  query: string;
  statusFilter: MlOperatorStatusFilter;
  sourceFilter: MlOperatorSourceFilter;
  pageSize: number;
  totalSectionCount: number;
  filteredSectionCount: number;
  returnedItems: number;
  onSelectView: (view: MlOperatorSavedViewConfig) => void;
}) {
  const activeView = ML_OPERATOR_SAVED_VIEW_CONFIGS.find((view) => view.key === activeViewKey);
  const activeViewLabel = activeView?.label || 'تنظیم دستی';
  const queryText = query.trim() ? `عبارت جستجو: ${query.trim()}` : 'بدون عبارت جستجو';
  const sourceText = sourceFilter === 'all' ? 'همه منابع خواندنی' : routeLabel(sourceFilter as MlOperatorOverviewRouteKey);
  const noteItems = [
    `نمای فعلی: ${activeViewLabel}`,
    `${formatExactNumberText(filteredSectionCount)} از ${formatExactNumberText(totalSectionCount)} بخش در محدوده فعلی دیده می‌شود.`,
    `${formatExactNumberText(returnedItems)} رکورد از پاسخ خواندنی موجود است؛ شمارش تازه‌ای در سرور ثبت نمی‌شود.`,
    `${sourceText}، ${statusLabels[statusFilter]}، ${queryText}، ${formatExactNumberText(pageSize)} ردیف در هر صفحه.`,
    'یادداشت‌ها فقط از وضعیت فعلی صفحه ساخته می‌شوند و در هیچ محل عملیاتی ذخیره نمی‌شوند.',
  ];

  return (
    <section
      className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_48px_-44px_rgba(15,23,42,0.42)] dark:border-slate-800 dark:bg-slate-900/80"
      data-ml-operator-saved-views-anchor="read-only-local-presets-audit-notes"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700 ring-1 ring-slate-200 dark:bg-slate-950/60 dark:text-slate-200 dark:ring-slate-800">
              <i className="fa-solid fa-bookmark" />
              نماهای ذخیره‌شده خواندنی
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-black text-primary ring-1 ring-primary/20">
              <i className="fa-solid fa-clipboard-check" />
              یادداشت ممیزی خودکار
            </span>
          </div>
          <h2 className="text-base font-black text-slate-950 dark:text-white">نماهای آماده برای بررسی سریع</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500 dark:text-slate-400">
            این نماها فقط فیلترهای فعلی صفحه را تغییر می‌دهند و چیزی در سرور، پایگاه داده یا سوابق فروشگاه ذخیره نمی‌کنند.
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-3 text-xs font-black text-slate-500 ring-1 ring-slate-200 dark:bg-slate-950/40 dark:text-slate-300 dark:ring-slate-800">
          <i className="fa-solid fa-lock ml-2" />
          وضعیت فعلی: {activeViewLabel}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {ML_OPERATOR_SAVED_VIEW_CONFIGS.map((view) => {
          const selected = view.key === activeViewKey;
          return (
            <button
              key={view.key}
              type="button"
              onClick={() => onSelectView(view)}
              className={`rounded-[22px] border p-4 text-right transition hover:-translate-y-0.5 ${
                selected
                  ? 'border-primary/40 bg-primary/10 text-primary ring-2 ring-primary/15'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white dark:border-slate-800 dark:bg-slate-950/35 dark:text-slate-200 dark:hover:bg-slate-950/60'
              }`}
              aria-pressed={selected}
            >
              <div className="flex items-start gap-3">
                <IconGlyph tone="neutral" className="h-10 w-10 shrink-0 text-sm" aria-hidden="true"><i className={`fa-solid ${view.icon}`} /></IconGlyph>
                <span className="min-w-0">
                  <span className="block text-sm font-black">{view.label}</span>
                  <span className="mt-1 block text-xs leading-6 opacity-75">{view.description}</span>
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/35">
        <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
          <i className="fa-solid fa-clipboard-list text-slate-400" />
          یادداشت‌های ممیزی خواندنی
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {noteItems.map((item) => (
            <div key={item} className="rounded-2xl bg-white p-3 text-xs font-bold leading-6 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800">
              <i className="fa-solid fa-check-circle ml-2 text-slate-400" />
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
