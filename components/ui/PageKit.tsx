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
}) => {
  const location = useLocation();
  const isReportRoute = location.pathname.startsWith('/reports');
  const hasActionBar = Boolean(onExport || onPrint || onReset || actionLeft || actionRight);
  const headerWrapClass = stickyToolbar ? 'sticky top-0 z-10' : '';
  const toolbarWrapClass = 'flex w-full flex-wrap items-center justify-start gap-1.5 sm:gap-2 xl:w-auto xl:justify-end';
  const resolvedLoadingTone = loadingTone ?? inferLoadingTone(title, subtitle);
  const isReportPage = isReportRoute || /گزارش|تحلیل|مقایسه|تطبیق|پایش/.test(String(title || ''));
  const toolbarCluster = toolbarRight ? <div className={toolbarWrapClass}>{toolbarRight}</div> : undefined;
  const resolvedActions = !isReportPage ? toolbarCluster : undefined;
  const resolvedSecondaryRow = secondaryRow ?? (isReportPage ? toolbarCluster : undefined);
  const hasFilterBar = Boolean((query !== undefined && onQueryChange) || filtersSlot || resolvedSecondaryRow);
  const hasHeaderContent = hasFilterBar || hasActionBar;

  return (
    <PageShell
      title={title}
      description={subtitle}
      icon={icon}
      className={[className, isReportRoute ? 'report-merged-page reports-single-title-body' : ''].filter(Boolean).join(' ')}
      actions={resolvedActions}
      headerContent={hasHeaderContent ? (
        <div className={headerWrapClass}>
          {hasFilterBar ? (
            <ResponsiveFilterBar
              search={(query !== undefined && onQueryChange) ? (
                <AppSearchField
                  value={query ?? ''}
                  onChange={(v) => onQueryChange?.(v)}
                  placeholder={searchPlaceholder}
                  ariaLabel={searchPlaceholder}
                  clearable={Boolean(query)}
                  size="lg"
                  className="ux-single-surface-search w-full min-w-0"
                />
              ) : undefined}
              filters={filtersSlot ? <div className="flex w-full flex-wrap items-center justify-start gap-2">{filtersSlot}</div> : undefined}
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
      ) : undefined}
    >
      {error ? (
        <div className="ux-inline-feedback ux-inline-feedback-error app-inline-alert app-inline-alert--danger">
          <span className="ux-inline-feedback__icon app-inline-alert__icon"><i className="fa-solid fa-triangle-exclamation" /></span>
          <div className="min-w-0 flex-1">
            <div className="app-inline-alert__title">در بارگذاری این بخش مشکلی ایجاد شد</div>
            <div className="app-inline-alert__text">{error}</div>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <div className="space-y-3">
          <div className="ux-inline-feedback ux-inline-feedback-info app-inline-alert app-inline-alert--info">
            <span className="ux-inline-feedback__icon app-inline-alert__icon"><i className="fa-solid fa-spinner fa-spin" /></span>
            <div className="min-w-0 flex-1">
              <div className="app-inline-alert__title">در حال آماده‌سازی اطلاعات این بخش</div>
              <div className="app-inline-alert__text">چند لحظه صبر کنید؛ داده‌ها، فیلترها و وضعیت عملیات در حال دریافت اطلاعات هستند.</div>
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
        children
      )}
    </PageShell>
  );
};

export default PageKit;
