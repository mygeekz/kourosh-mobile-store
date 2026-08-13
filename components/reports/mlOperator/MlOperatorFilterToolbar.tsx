import { formatExactNumberText } from '../../../utils/exactNumber';
import { SelectField, TextField } from '@/components/ui';
import type { MlOperatorOverviewRouteKey, MlOperatorRouteState } from '../../../services/mlOperatorOverviewApi';

export type MlOperatorStatusFilter = 'all' | MlOperatorRouteState;
export type MlOperatorSourceFilter = 'all' | MlOperatorOverviewRouteKey;

const statusOptions: Array<{ value: MlOperatorStatusFilter; label: string; icon: string }> = [
  { value: 'all', label: 'همه وضعیت‌ها', icon: 'fa-layer-group' },
  { value: 'ready', label: 'دارای داده', icon: 'fa-circle-check' },
  { value: 'empty', label: 'خالی', icon: 'fa-circle' },
  { value: 'unauthorized', label: 'محدود دسترسی', icon: 'fa-lock' },
  { value: 'unavailable', label: 'در دسترس نیست', icon: 'fa-plug-circle-xmark' },
  { value: 'error', label: 'دارای خطا', icon: 'fa-triangle-exclamation' },
];

const sourceOptions: Array<{ value: MlOperatorSourceFilter; label: string }> = [
  { value: 'all', label: 'همه بخش‌ها' },
  { value: 'comparisonSummaries', label: 'مقایسه‌ها' },
  { value: 'importReceipts', label: 'رسیدهای ورود' },
  { value: 'receiptExports', label: 'خروجی رسیدها' },
  { value: 'exportPackages', label: 'بسته‌های خروجی' },
  { value: 'packageSnapshots', label: 'اسنپ‌شات‌ها' },
];

const pageSizeOptions = [2, 3, 5];

export function MlOperatorFilterToolbar({
  query,
  statusFilter,
  sourceFilter,
  pageSize,
  filteredSectionCount,
  totalSectionCount,
  onQueryChange,
  onStatusFilterChange,
  onSourceFilterChange,
  onPageSizeChange,
  onReset,
}: {
  query: string;
  statusFilter: MlOperatorStatusFilter;
  sourceFilter: MlOperatorSourceFilter;
  pageSize: number;
  filteredSectionCount: number;
  totalSectionCount: number;
  onQueryChange: (value: string) => void;
  onStatusFilterChange: (value: MlOperatorStatusFilter) => void;
  onSourceFilterChange: (value: MlOperatorSourceFilter) => void;
  onPageSizeChange: (value: number) => void;
  onReset: () => void;
}) {
  const hasActiveFilters = Boolean(query.trim()) || statusFilter !== 'all' || sourceFilter !== 'all' || pageSize !== 3;

  return (
    <section
      className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_48px_-44px_rgba(15,23,42,0.42)] dark:border-slate-800 dark:bg-slate-900/80"
      data-ml-operator-filter-toolbar-anchor="read-only-client-side-filtering"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700 ring-1 ring-slate-200 dark:bg-slate-950/60 dark:text-slate-200 dark:ring-slate-800">
              <i className="fa-solid fa-filter" />
              پالایش خواندنی
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-black text-primary ring-1 ring-primary/20">
              <i className="fa-solid fa-table-list" />
              {formatExactNumberText(filteredSectionCount)} از {formatExactNumberText(totalSectionCount)} بخش
            </span>
          </div>
          <label className="block text-xs font-black text-slate-500 dark:text-slate-400" htmlFor="ml-operator-search-input">
            جستجو در شناسه، وضعیت، هش و خلاصه فراداده
          </label>
          <div className="relative mt-2">
            <i className="fa-solid fa-magnifying-glass pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <TextField
              controlOnly
              unstyled
              id="ml-operator-search-input"
              type="search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="برای نمونه: شناسه، هش، وضعیت یا کد همبستگی"
              className="min-h-[46px] w-full rounded-[18px] border border-slate-200 bg-slate-50 pr-11 pl-4 text-sm font-bold text-slate-800 outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-950/45 dark:text-slate-100 dark:focus:bg-slate-950"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[560px]">
          <label className="min-w-0">
            <span className="block text-xs font-black text-slate-500 dark:text-slate-400">نوع بخش</span>
            <SelectField
              controlOnly
              unstyled
              showChevron={false}
              value={sourceFilter}
              onChange={(event) => onSourceFilterChange(event.target.value as MlOperatorSourceFilter)}
              className="mt-2 min-h-[44px] w-full rounded-[18px] border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-800 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-950/45 dark:text-slate-100"
            >
              {sourceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectField>
          </label>

          <label className="min-w-0">
            <span className="block text-xs font-black text-slate-500 dark:text-slate-400">وضعیت</span>
            <SelectField
              controlOnly
              unstyled
              showChevron={false}
              value={statusFilter}
              onChange={(event) => onStatusFilterChange(event.target.value as MlOperatorStatusFilter)}
              className="mt-2 min-h-[44px] w-full rounded-[18px] border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-800 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-950/45 dark:text-slate-100"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectField>
          </label>

          <label className="min-w-0">
            <span className="block text-xs font-black text-slate-500 dark:text-slate-400">تعداد ردیف</span>
            <SelectField
              controlOnly
              unstyled
              showChevron={false}
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              className="mt-2 min-h-[44px] w-full rounded-[18px] border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-800 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-950/45 dark:text-slate-100"
            >
              {pageSizeOptions.map((value) => (
                <option key={value} value={value}>
                  {formatExactNumberText(value)} ردیف در صفحه
                </option>
              ))}
            </SelectField>
          </label>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
        <div className="flex flex-wrap gap-2">
          {statusOptions
            .filter((option) => option.value === statusFilter && option.value !== 'all')
            .map((option) => (
              <span key={option.value} className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700 ring-1 ring-slate-200 dark:bg-slate-950/60 dark:text-slate-200 dark:ring-slate-800">
                <i className={`fa-solid ${option.icon}`} />
                {option.label}
              </span>
            ))}
          {sourceFilter !== 'all' ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700 ring-1 ring-slate-200 dark:bg-slate-950/60 dark:text-slate-200 dark:ring-slate-800">
              <i className="fa-solid fa-folder-tree" />
              {sourceOptions.find((option) => option.value === sourceFilter)?.label || 'بخش انتخاب‌شده'}
            </span>
          ) : null}
          {query.trim() ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700 ring-1 ring-slate-200 dark:bg-slate-950/60 dark:text-slate-200 dark:ring-slate-800">
              <i className="fa-solid fa-quote-right" />
              {query.trim()}
            </span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onReset}
          disabled={!hasActiveFilters}
          className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        >
          <i className="fa-solid fa-eraser" />
          پاکسازی فیلترها
        </button>
      </div>
    </section>
  );
}
