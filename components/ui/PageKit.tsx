import React from 'react';
import { useLocation } from 'react-router-dom';
import PageShell from './PageShell';
import ActionBar from './ActionBar';
import EmptyState from './EmptyState';
import ResponsiveFilterBar from './ResponsiveFilterBar';
import { FormSkeleton, TableSkeleton } from './Skeletons';
import AppSearchField from './AppSearchField';

type SkeletonTone = 'neutral' | 'info' | 'success' | 'warning' | 'violet';

const inferLoadingTone = (title: string, subtitle?: string): SkeletonTone => {
  const normalized = `${title || ''} ${subtitle || ''}`;
  if (/مشتری/.test(normalized)) return 'info';
  if (/همکار|تامین|تأمین|شبکه/.test(normalized)) return 'violet';
  if (/قسط|اقساط|سررسید|چک/.test(normalized)) return 'warning';
  if (/گزارش|تحلیل|dashboard|داشبورد/i.test(normalized)) return 'info';
  if (/تعمیر/.test(normalized)) return 'violet';
  if (/کالا|محصول|انبار|موجودی|خرید/.test(normalized)) return 'success';
  return 'neutral';
};

type Props = {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  backAction?: () => void;

  // toolbar
  query?: string;
  onQueryChange?: (v: string) => void;
  searchPlaceholder?: string;
  filtersSlot?: React.ReactNode;
  toolbarRight?: React.ReactNode;
  secondaryRow?: React.ReactNode;
  controlDock?: React.ReactNode;
  stickyToolbar?: boolean;

  // action bar
  actionLeft?: React.ReactNode;
  actionRight?: React.ReactNode;
  onExport?: () => void;
  onPrint?: () => void;
  onReset?: () => void;

  // states
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void | Promise<void>;

  error?: string;
  loadingTone?: SkeletonTone;

  children: React.ReactNode;
  className?: string;
  headerLayout?: 'stacked' | 'inline';
  searchSize?: 'sm' | 'md' | 'lg';
  hideAutoHeader?: boolean;
};

const PageKit: React.FC<Props> = ({
  title,
  subtitle,
  icon,
  query,
  onQueryChange,
  searchPlaceholder = 'جستجو…',
  filtersSlot,
  toolbarRight,
  secondaryRow,
  controlDock,
  stickyToolbar,
  actionLeft,
  actionRight,
  onExport,
  onPrint,
  onReset,
  isLoading,
  isEmpty,
  emptyTitle = 'داده‌ای پیدا نشد',
  emptyDescription,
  emptyActionLabel,
  onEmptyAction,
  error,
  loadingTone,
  children,
  className,
  headerLayout = 'stacked',
  searchSize = 'lg',
  hideAutoHeader = false,
}) => {
  const location = useLocation();
  const hasPresentedContentRef = React.useRef(!isLoading);
  if (!isLoading) hasPresentedContentRef.current = true;
  const showInitialLoadingState = Boolean(isLoading && !hasPresentedContentRef.current);
  const isReportRoute = location.pathname.startsWith('/reports');
  const hasActionBar = Boolean(onExport || onPrint || onReset || actionLeft || actionRight);
  const headerWrapClass = stickyToolbar ? 'sticky top-0 z-10' : '';
  const toolbarWrapClass = 'flex w-full flex-wrap items-center justify-start gap-1.5 sm:gap-2 xl:w-auto xl:justify-end';
  const resolvedLoadingTone = loadingTone ?? inferLoadingTone(title, subtitle);
  const isReportPage = isReportRoute || /گزارش|تحلیل|مقایسه|تطبیق|پایش/.test(String(title || ''));
  const toolbarCluster = toolbarRight ? <div className={toolbarWrapClass}>{toolbarRight}</div> : undefined;
  const resolvedFilterActions = !isReportPage ? toolbarCluster : undefined;
  const resolvedSecondaryRow = secondaryRow ?? (isReportPage ? toolbarCluster : undefined);
  const hasSearch = Boolean(query !== undefined && onQueryChange);
  const hasFilterBar = Boolean(hasSearch || filtersSlot || resolvedFilterActions || resolvedSecondaryRow);
  const useDirectInlineSearch = Boolean(
    headerLayout === 'inline'
    && hasSearch
    && !filtersSlot
    && !resolvedFilterActions
    && !resolvedSecondaryRow
    && !hasActionBar
  );
  const directInlineSearch = useDirectInlineSearch ? (
    <div className="w-full min-w-0" data-ui-inline-page-search="true">
      <AppSearchField
        value={query ?? ''}
        onChange={(v) => onQueryChange?.(v)}
        placeholder={searchPlaceholder}
        ariaLabel={searchPlaceholder}
        clearable={Boolean(query)}
        size={searchSize}
        className="w-full min-w-0"
      />
    </div>
  ) : undefined;
  const hasHeaderContent = hasFilterBar || hasActionBar;

  return (
    <PageShell
      title={title}
      description={subtitle}
      icon={icon}
      className={[className, isReportRoute ? 'report-merged-page reports-single-title-body' : ''].filter(Boolean).join(' ')}
      actions={undefined}
      headerLayout={headerLayout}
      hideAutoHeader={hideAutoHeader}
      headerContent={directInlineSearch ?? (hasHeaderContent ? (
        <div className={headerWrapClass}>
          {hasFilterBar ? (
            <ResponsiveFilterBar
              search={hasSearch ? (
                <AppSearchField
                  value={query ?? ''}
                  onChange={(v) => onQueryChange?.(v)}
                  placeholder={searchPlaceholder}
                  ariaLabel={searchPlaceholder}
                  clearable={Boolean(query)}
                  size={searchSize}
                  className="ux-single-surface-search w-full min-w-0"
                />
              ) : undefined}
              filters={filtersSlot ? <div className="flex w-full flex-wrap items-center justify-start gap-2">{filtersSlot}</div> : undefined}
              actions={resolvedFilterActions}
              secondaryRow={resolvedSecondaryRow}
            />
          ) : null}

          {hasActionBar ? (
            <div className="mt-3">
              <ActionBar
                left={actionLeft}
                right={actionRight}
                onExport={onExport}
                onPrint={onPrint}
                onReset={onReset}
                disabled={!!isLoading}
              />
            </div>
          ) : null}
        </div>
      ) : undefined)}
    >
      {controlDock ? <div className="mb-4 sm:mb-5">{controlDock}</div> : null}

      {error ? (
        <div className="app-inline-alert app-inline-alert--danger flex items-start gap-3">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center border-0 bg-transparent text-rose-500 shadow-none dark:text-rose-300">
            <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="m-0 text-sm font-black leading-6 text-text">در بارگذاری این بخش مشکلی ایجاد شد</p>
            <p className="m-0 text-xs leading-6 text-muted">{error}</p>
          </div>
        </div>
      ) : null}

      {showInitialLoadingState ? (
        <div className="space-y-3" role="status" aria-live="polite">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex min-w-0 items-center gap-3 px-4 py-3.5 sm:px-5 sm:py-4">
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900">
                <img src="/kourosh-logo.svg" alt="" className="h-full w-full object-contain" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="m-0 text-sm font-black leading-6 text-slate-900 dark:text-slate-50">در حال آماده‌سازی {title}</p>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-sky-700 dark:text-sky-300">
                    <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
                    دریافت اطلاعات
                  </span>
                </div>
                <p className="mt-0.5 mb-0 text-xs font-medium leading-6 text-slate-600 dark:text-slate-300">اطلاعات، فیلترها و وضعیت‌های این بخش در حال همگام‌سازی هستند؛ صفحه پس از دریافت داده‌ها خودکار آماده می‌شود.</p>
              </div>
            </div>
            <div className="h-1 w-full overflow-hidden bg-slate-100 dark:bg-slate-900" aria-hidden="true">
              <div className="h-full w-2/5 animate-pulse rounded-full bg-sky-500" />
            </div>
          </div>
          <div className="grid gap-3">
            <FormSkeleton blocks={4} tone={resolvedLoadingTone} />
            <TableSkeleton tone={resolvedLoadingTone} />
          </div>
        </div>
      ) : isEmpty ? (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          actionLabel={emptyActionLabel}
          onAction={onEmptyAction}
        />
      ) : (
        <div aria-busy={Boolean(isLoading)} data-ui-page-refreshing={isLoading ? 'true' : 'false'}>
          {children}
        </div>
      )}
    </PageShell>
  );
};

export default PageKit;
