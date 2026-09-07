import React from 'react';
import Button from '../Button';
import IconGlyph from './IconGlyph';

export type FinancialTimelineTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export type FinancialTimelineProps = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  eyebrow?: React.ReactNode;
  iconClass?: string;
  countLabel?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  loading?: boolean;
  refreshing?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyTitle?: React.ReactNode;
  emptyDescription?: React.ReactNode;
  emptyIconClass?: string;
  onRefresh?: () => void;
  onRetry?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  loadMoreLabel?: React.ReactNode;
  completeLabel?: React.ReactNode;
  compact?: boolean;
  tone?: FinancialTimelineTone;
  className?: string;
  bodyClassName?: string;
  ariaLabel?: string;
};

export type FinancialTimelineEntryProps = {
  children: React.ReactNode;
  marker?: React.ReactNode;
  markerTone?: FinancialTimelineTone;
  isLast?: boolean;
  compact?: boolean;
  className?: string;
  contentClassName?: string;
};

const toneClassMap: Record<FinancialTimelineTone, string> = {
  neutral: 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
  info: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-200',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200',
  warning: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200',
  danger: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200',
};

const FinancialTimeline: React.FC<FinancialTimelineProps> = ({
  title,
  subtitle,
  eyebrow = 'تایم‌لاین مالی',
  iconClass = 'fa-solid fa-timeline',
  countLabel,
  actions,
  children,
  loading = false,
  refreshing = false,
  error,
  empty = false,
  emptyTitle = 'هنوز رویداد مالی ثبت نشده است',
  emptyDescription = 'پس از ثبت اولین رویداد، تاریخچه در این بخش نمایش داده می‌شود.',
  emptyIconClass = 'fa-solid fa-receipt',
  onRefresh,
  onRetry,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  loadMoreLabel = 'نمایش بیشتر',
  completeLabel,
  compact = false,
  tone = 'neutral',
  className = '',
  bodyClassName = '',
  ariaLabel,
}) => {
  const hasVisibleContent = !loading && !empty && React.Children.count(children) > 0;
  const initialError = Boolean(error && !hasVisibleContent);

  return (
    <section
      className={`overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm ring-1 ring-slate-100/70 dark:border-slate-800 dark:bg-slate-900 dark:ring-slate-800 ${compact ? 'rounded-[20px]' : ''} ${className}`}
      aria-label={ariaLabel || (typeof title === 'string' ? title : 'تایم‌لاین مالی')}
    >
      <header className={`flex min-w-0 flex-col gap-3 border-b border-slate-200/80 px-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between ${compact ? 'py-3' : 'py-4'}`}>
        <div className="flex min-w-0 items-start gap-3">
          <IconGlyph tone={tone === 'danger' ? 'danger' : tone === 'warning' ? 'warning' : tone === 'success' ? 'success' : tone === 'info' ? 'info' : 'neutral'} className="mt-0.5 h-9 w-9 shrink-0" aria-hidden="true">
            <i className={iconClass} />
          </IconGlyph>
          <div className="min-w-0">
            {eyebrow ? <div className="text-[10px] font-black tracking-[0.11em] text-slate-400 dark:text-slate-500">{eyebrow}</div> : null}
            <h4 className={`${compact ? 'mt-0.5 text-sm' : 'mt-1 text-base'} min-w-0 break-words font-black text-slate-950 dark:text-slate-50`}>{title}</h4>
            {subtitle ? <div className="mt-1 max-w-3xl text-[11px] font-semibold leading-5 text-slate-500 dark:text-slate-400">{subtitle}</div> : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          {countLabel ? (
            <span className="inline-flex min-h-8 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-[10px] font-black text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <i className="fa-solid fa-list-ul" aria-hidden="true" />
              {countLabel}
            </span>
          ) : null}
          {actions}
          {onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing || loading}
              data-skip-global-button="true"
              className="inline-flex min-h-8 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 text-[10px] font-black text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800"
            >
              <i className={`fa-solid ${refreshing || loading ? 'fa-spinner fa-spin' : 'fa-rotate-right'}`} aria-hidden="true" />
              {refreshing || loading ? 'در حال بروزرسانی' : 'بروزرسانی'}
            </button>
          ) : null}
        </div>
      </header>

      {loading ? (
        <div className="flex min-h-[160px] flex-col items-center justify-center gap-3 px-5 py-8 text-center" role="status" aria-live="polite">
          <IconGlyph tone="info" className="h-11 w-11" aria-hidden="true"><i className="fa-solid fa-circle-notch fa-spin" /></IconGlyph>
          <div className="text-sm font-black text-slate-800 dark:text-slate-100">در حال دریافت تاریخچه</div>
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">فقط اطلاعات موردنیاز همین بخش از سرور خوانده می‌شود.</div>
        </div>
      ) : initialError ? (
        <div className="flex min-h-[160px] flex-col items-center justify-center gap-3 px-5 py-8 text-center" role="alert">
          <IconGlyph tone="warning" className="h-11 w-11" aria-hidden="true"><i className="fa-solid fa-triangle-exclamation" /></IconGlyph>
          <div className="text-sm font-black text-slate-800 dark:text-slate-100">دریافت تاریخچه کامل نشد</div>
          <div className="max-w-xl text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">{error}</div>
          {onRetry ? <Button type="button" variant="secondary" size="xs" onClick={onRetry} leftIcon={<i className="fa-solid fa-rotate-right" />}>تلاش دوباره</Button> : null}
        </div>
      ) : empty ? (
        <div className="flex min-h-[150px] flex-col items-center justify-center gap-3 px-5 py-8 text-center">
          <IconGlyph tone="neutral" className="h-11 w-11" aria-hidden="true"><i className={emptyIconClass} /></IconGlyph>
          <div className="text-sm font-black text-slate-800 dark:text-slate-100">{emptyTitle}</div>
          <div className="max-w-xl text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">{emptyDescription}</div>
        </div>
      ) : (
        <div className={`${compact ? 'p-3' : 'p-4'} ${bodyClassName}`}>{children}</div>
      )}

      {!loading && !initialError && error && hasVisibleContent ? (
        <div className="mx-4 mb-3 flex flex-col items-center justify-between gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-center sm:flex-row sm:text-right dark:border-amber-900/50 dark:bg-amber-950/20">
          <span className="text-[10px] font-bold leading-5 text-amber-800 dark:text-amber-200">{error}</span>
          {onRetry ? <Button type="button" variant="secondary" size="xs" onClick={onRetry} leftIcon={<i className="fa-solid fa-rotate-right" />}>تلاش دوباره</Button> : null}
        </div>
      ) : null}

      {!loading && !initialError && !empty && (hasMore || completeLabel) ? (
        <footer className="border-t border-slate-200/80 px-4 py-3 text-center dark:border-slate-800">
          {hasMore && onLoadMore ? (
            <Button
              type="button"
              variant="secondary"
              size="xs"
              onClick={onLoadMore}
              disabled={loadingMore}
              loading={loadingMore}
              leftIcon={<i className="fa-solid fa-chevron-down" />}
            >
              {loadingMore ? 'در حال دریافت…' : loadMoreLabel}
            </Button>
          ) : completeLabel ? (
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{completeLabel}</div>
          ) : null}
        </footer>
      ) : null}
    </section>
  );
};

export const FinancialTimelineEntry: React.FC<FinancialTimelineEntryProps> = ({
  children,
  marker,
  markerTone = 'neutral',
  isLast = false,
  compact = false,
  className = '',
  contentClassName = '',
}) => (
  <article className={`grid min-w-0 grid-cols-[34px_minmax(0,1fr)] gap-2.5 ${className}`}>
    <div className="relative flex min-h-full justify-center">
      <span className={`relative z-10 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-black ${toneClassMap[markerTone]}`}>
        {marker ?? <i className="fa-solid fa-circle text-[6px]" aria-hidden="true" />}
      </span>
      {!isLast ? <span className="absolute bottom-[-12px] top-7 w-px bg-slate-200 dark:bg-slate-700" aria-hidden="true" /> : null}
    </div>
    <div className={`min-w-0 rounded-[18px] border border-slate-200 bg-slate-50/60 shadow-sm dark:border-slate-800 dark:bg-slate-950/35 ${compact ? 'p-2.5' : 'p-3'} ${contentClassName}`}>
      {children}
    </div>
  </article>
);

export default FinancialTimeline;
