import React from 'react';
import { cn } from '../../utils/cn';
import SurfaceHeader from './SurfaceHeader';

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
}) => {
  const meta = deriveMeta(title);
  const classNameValue = String(className || '');
  const isReportMergedPage = classNameValue.includes('report-merged-page');
  const isCompactReportPage = classNameValue.includes('realized-profit-compact-page');
  const isReportHeader = /گزارش|تحلیل|مقایسه|تطبیق|پایش/.test(String(title || ''));
  const shouldRenderAutoHeader = !hideAutoHeader && !isReportMergedPage && !/تنظیمات|Settings/i.test(String(title || '')) && !classNameValue.includes('settings-shell') && !classNameValue.includes('people-merged-page');

  return (
    <div
      className={cn('page-content-stack text-right', className)}
      data-ui-page-shell="true"
      data-ui-page-kind={isReportHeader ? 'report' : 'standard'}
      dir="rtl"
    >
      {shouldRenderAutoHeader ? (
        <div className="mx-auto max-w-7xl px-3 sm:px-4" data-ui-page-header-wrap="true">
          <div
            className={cn(
              'page-shell-modern rounded-[28px] border border-slate-200/85 bg-white px-4 shadow-[0_22px_54px_-42px_rgba(15,23,42,0.34)] dark:border-slate-800/90 dark:bg-slate-950/80 md:px-5',
              isCompactReportPage ? 'py-3 md:py-3' : 'py-4 md:py-5',
            )}
            data-ui-surface="page-header"
            data-ui-card="true"
            data-ui-density={isCompactReportPage ? 'compact' : 'comfortable'}
          >
            <SurfaceHeader
              kind="page"
              density={isCompactReportPage ? 'compact' : 'comfortable'}
              tone={isReportHeader ? 'info' : 'neutral'}
              icon={icon}
              title={title}
              titleAs="h1"
              subtitle={description}
              actions={actions}
              kicker={!isCompactReportPage ? (
                <>
                  <span className="page-shell-kicker-dot" />
                  <span>{meta.label}</span>
                </>
              ) : undefined}
              status={!isCompactReportPage ? (
                <>
                  <i className="fa-solid fa-chart-line text-[10px]" />
                  <span className="min-w-0">{meta.status}</span>
                </>
              ) : undefined}
              className="page-shell-surface-header"
              leadClassName="min-w-0 flex-1 text-right"
              bodyClassName="min-w-0 flex-1 text-right"
              kickerClassName="page-shell-kicker mr-0 ml-auto"
              titleClassName={cn(
                'break-words text-right font-black tracking-tight text-slate-950 dark:text-slate-50',
                isReportHeader ? 'w-auto text-[1.1rem] md:text-[1.45rem]' : 'w-full text-[1.1rem] md:w-auto md:text-[1.55rem]',
              )}
              statusClassName="page-shell-status-chip max-w-full break-words leading-5"
              subtitleClassName={cn(
                'max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400 text-right',
                isReportHeader ? 'md:max-w-[min(100%,38rem)] md:text-[13px]' : 'mt-1.5 md:text-[14px]',
              )}
              iconClassName="page-shell-icon shrink-0"
              actionsClassName="page-shell-actions w-full justify-start xl:w-auto xl:max-w-[min(100%,920px)] xl:justify-end"
            />

            {headerContent ? (
              <div className={cn('border-t border-slate-200/70 dark:border-slate-800/80 page-shell-header-content', isCompactReportPage ? 'mt-2 pt-2' : 'mt-3 pt-3')}>
                {headerContent}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {!shouldRenderAutoHeader && isReportMergedPage && (actions || headerContent) ? (
        <div className="mx-auto max-w-7xl px-3 sm:px-4">
          <div className="report-merged-toolbar rounded-[26px] border border-slate-200/85 bg-white/90 px-3 py-3 shadow-[0_18px_42px_-36px_rgba(15,23,42,0.32)] backdrop-blur dark:border-slate-800/90 dark:bg-slate-950/80 md:px-4" data-ui-surface="report-toolbar">
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

      <div className="space-y-4" data-ui-page-body="true">{children}</div>
    </div>
  );
};

export default PageShell;
