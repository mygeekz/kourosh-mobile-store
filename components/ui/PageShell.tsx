import React from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '../../utils/cn';
import SurfaceHeader from './SurfaceHeader';
import { resolveNavigationContext } from '../../utils/navigationContext';

const deriveMeta = (title: string) => {
  if (/داشبورد/.test(title)) return { label: 'نمای مدیریتی', status: 'در حال پایش کسب‌وکار' };
  if (/تنظیمات/.test(title)) return { label: 'پیکربندی سیستم', status: 'تنظیمات قابل مدیریت است' };
  if (/گزارش/.test(title)) return { label: 'مرکز گزارش‌ها', status: 'خروجی و تحلیل در دسترس' };
  if (/اقساط/.test(title)) return { label: 'عملیات اقساط', status: 'سررسیدها، پرداخت‌ها و وضعیت قراردادها از این بخش مدیریت می‌شود' };
  if (/فروش/.test(title)) return { label: 'عملیات فروش', status: 'ثبت اطلاعات و مدیریت فروش از این بخش انجام می‌شود' };
  if (/تعمیر/.test(title)) return { label: 'عملیات خدمات', status: 'وضعیت سفارش‌ها یکجا مدیریت می‌شود' };
  if (/مشتری/.test(title)) return { label: 'ارتباط با مشتری', status: 'سوابق و تعاملات قابل پیگیری است' };
  if (/همکار|تامین|تأمین/.test(title)) return { label: 'شبکه همکاران', status: 'همکاری‌ها و تسویه‌ها در دسترس است' };
  if (/کالا|محصول|انبار/.test(title)) return { label: 'عملیات انبار', status: 'موجودی و قیمت‌ها تحت کنترل است' };
  return { label: 'نمای کاری', status: 'جزئیات و اقدامات این بخش در دسترس است' };
};

export type PageShellProps = {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  headerContent?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  hideAutoHeader?: boolean;
  headerLayout?: 'stacked' | 'inline';
};

const PageShell: React.FC<PageShellProps> = ({
  title,
  description,
  icon,
  actions,
  headerContent,
  children,
  className,
  hideAutoHeader,
  headerLayout = 'stacked',
}) => {
  const location = useLocation();
  const meta = deriveMeta(title);
  const navigationContext = resolveNavigationContext(location.pathname);
  const contextLabels = navigationContext.breadcrumbLabels;
  const classNameValue = String(className || '');
  const isReportMergedPage = classNameValue.includes('report-merged-page');
  const isCompactReportPage = /(?:partner-performance-executive-page)/.test(classNameValue);
  const isReportHeader = /گزارش|تحلیل|مقایسه|تطبیق|پایش/.test(String(title || ''));
  const shouldRenderAutoHeader = !hideAutoHeader && !isReportMergedPage && !/تنظیمات|Settings/i.test(String(title || '')) && !classNameValue.includes('settings-shell') && !classNameValue.includes('people-merged-page');
  const hasMergedToolbar = !shouldRenderAutoHeader && isReportMergedPage && Boolean(actions || headerContent);
  const hasTopSurface = shouldRenderAutoHeader || hasMergedToolbar;
  const hasControlHeader = Boolean(headerContent);
  const useCompactHeader = isCompactReportPage || hasControlHeader;
  const useInlineControlHeader = headerLayout === 'inline' && hasControlHeader;

  return (
    <div
      className={cn('page-content-stack text-right', className)}
      data-ui-page-shell="true"
      data-ui-page-kind={isReportHeader ? 'report' : 'standard'}
      dir="rtl"
    >
      {shouldRenderAutoHeader ? (
        useInlineControlHeader ? (
          <div className="mx-auto max-w-7xl px-3 sm:px-4" data-ui-page-header-wrap="true">
            <div
              className="flex w-full min-w-0 flex-col gap-2 py-1 lg:flex-row lg:items-center lg:justify-between lg:gap-4"
              data-ui-page-header-layout="inline-flat"
              data-ui-density="compact"
            >
              <div className="flex min-w-0 shrink-0 items-center justify-start gap-2.5 text-right lg:max-w-[42%]">
                {icon ? (
                  <span data-ui-icon-surface="bare" className="inline-flex h-8 w-8 shrink-0 items-center justify-center border-0 bg-transparent text-slate-700 shadow-none dark:text-slate-200">
                    {icon}
                  </span>
                ) : null}
                <div className="min-w-0">
                  <h1 className="m-0 truncate text-[1.05rem] font-black tracking-tight text-slate-950 dark:text-slate-50 md:text-[1.2rem]">{title}</h1>
                  {description ? <p className="m-0 mt-0.5 line-clamp-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p> : null}
                </div>
              </div>

              <div className="min-w-0 w-full lg:max-w-xl lg:flex-1" data-ui-page-header-controls="true">
                {headerContent}
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-7xl px-3 sm:px-4" data-ui-page-header-wrap="true">
            <div
              className={cn(
                'page-shell-modern h-auto rounded-[28px] border border-slate-200/85 bg-white px-4 shadow-[0_22px_54px_-42px_rgba(15,23,42,0.34)] dark:border-slate-800/90 dark:bg-slate-950/80 md:px-5',
                useCompactHeader ? 'py-2.5 md:py-2.5' : 'py-4 md:py-5',
              )}
              data-ui-surface="page-header"
              data-ui-card="true"
              data-ui-density={useCompactHeader ? 'compact' : 'comfortable'}
            >
              <SurfaceHeader
                kind="page"
                density={useCompactHeader ? 'compact' : 'comfortable'}
                tone={isReportHeader ? 'info' : 'neutral'}
                icon={icon}
                title={title}
                titleAs="h1"
                subtitle={description}
                actions={actions}
                kicker={!useCompactHeader ? (
                  <>
                    <span className="page-shell-kicker-dot" />
                    {contextLabels.length > 0 ? (
                      <span className="inline-flex min-w-0 flex-wrap items-center gap-1" data-ui-page-context="true">
                        {contextLabels.map((label, index) => (
                          <React.Fragment key={`${label}-${index}`}>
                            {index > 0 ? <span className="opacity-50" aria-hidden="true">/</span> : null}
                            <span>{label}</span>
                          </React.Fragment>
                        ))}
                      </span>
                    ) : (
                      <span>{meta.label}</span>
                    )}
                  </>
                ) : undefined}
                status={!useCompactHeader ? (
                  <>
                    <i className="fa-solid fa-chart-line text-[10px]" />
                    <span className="min-w-0">{meta.status}</span>
                  </>
                ) : undefined}
                className="page-shell-surface-header"
                leadClassName="min-w-0 flex-1 text-right !flex-row !justify-start"
                bodyClassName="min-w-0 flex-1 text-right"
                kickerClassName="page-shell-kicker mr-0 ml-auto"
                titleClassName={cn(
                  'break-words text-right font-black tracking-tight text-slate-950 dark:text-slate-50',
                  useCompactHeader
                    ? 'w-auto text-[1.05rem] md:text-[1.3rem]'
                    : isReportHeader
                      ? 'w-auto text-[1.1rem] md:text-[1.45rem]'
                      : 'w-full text-[1.1rem] md:w-auto md:text-[1.55rem]',
                )}
                statusClassName="page-shell-status-chip max-w-full break-words leading-5"
                subtitleClassName={cn(
                  'max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400 text-right',
                  isReportHeader ? 'md:max-w-[min(100%,38rem)] md:text-[13px]' : 'mt-1.5 md:text-[14px]',
                )}
                iconClassName="page-shell-icon shrink-0 text-slate-700 dark:text-slate-200"
                actionsClassName="page-shell-actions w-full justify-start xl:w-auto xl:max-w-[min(100%,920px)] xl:justify-end"
              />

              {headerContent ? (
                <div className={cn(
                  'border-t border-slate-200/70 dark:border-slate-800/80 page-shell-header-content',
                  useCompactHeader ? 'mt-1.5 pt-1.5' : 'mt-3 pt-3',
                )}>
                  {headerContent}
                </div>
              ) : null}
            </div>
          </div>
        )
      ) : null}

      {hasMergedToolbar ? (
        <div className="mx-auto max-w-7xl px-3 sm:px-4">
          <div className={cn('report-merged-toolbar border border-slate-200/85 bg-white/90 shadow-[0_18px_42px_-36px_rgba(15,23,42,0.32)] backdrop-blur dark:border-slate-800/90 dark:bg-slate-950/80', isCompactReportPage ? 'rounded-[18px] px-2.5 py-2.5 md:px-3' : 'rounded-[26px] px-3 py-3 md:px-4')} data-ui-surface="report-toolbar">
            {actions ? (
              <div className="flex w-full flex-wrap items-stretch justify-start gap-2 xl:justify-end" data-ui-actions="true">
                {actions}
              </div>
            ) : null}
            {headerContent ? (
              <div className={actions ? 'mt-3 border-t border-slate-200/70 pt-3 dark:border-slate-800/80' : ''}>
                {headerContent}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className={cn(isCompactReportPage ? 'space-y-3' : 'space-y-4', hasTopSurface && (useCompactHeader ? 'mt-3' : isCompactReportPage ? 'mt-3' : 'mt-4 sm:mt-5'))} data-ui-page-body="true">{children}</div>
    </div>
  );
};

export default PageShell;
