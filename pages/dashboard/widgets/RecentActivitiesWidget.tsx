import React from 'react';
import moment from 'jalali-moment';
import type { ActivityItem } from '../../../types';
import type { DashboardWidgetProps } from '../types';
import Skeleton from '../../../components/ui/Skeleton';

type ActivityTone = 'sky' | 'emerald' | 'amber' | 'rose' | 'violet' | 'slate';

const toneClasses: Record<ActivityTone, string> = {
  sky: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800/60 dark:bg-sky-950/35 dark:text-sky-300',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/35 dark:text-emerald-300',
  amber: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/35 dark:text-amber-300',
  rose: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/35 dark:text-rose-300',
  violet: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800/60 dark:bg-violet-950/35 dark:text-violet-300',
  slate: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300',
};

const detectActivityTone = (activity: ActivityItem): ActivityTone => {
  const text = `${activity.icon || ''} ${activity.typeDescription || ''} ${activity.details || ''}`.toLowerCase();
  if (/repair|screw|wrench|تعمیر|پذیرش/.test(text)) return 'rose';
  if (/install|invoice|check|قسط|اقساط|چک/.test(text)) return 'amber';
  if (/sale|cash|revenue|فروش|درآمد|نقد/.test(text)) return 'emerald';
  if (/customer|user|person|مشتری|اشخاص/.test(text)) return 'violet';
  if (/phone|mobile|product|گوشی|محصول|کالا/.test(text)) return 'sky';
  return 'slate';
};

const safeActivityIcon = (activity: ActivityItem): string => {
  if (activity.icon && /^fa[srlbd]?\s|^fa-/.test(activity.icon)) return activity.icon;
  const tone = detectActivityTone(activity);
  if (tone === 'rose') return 'fa-solid fa-screwdriver-wrench';
  if (tone === 'amber') return 'fa-solid fa-file-invoice-dollar';
  if (tone === 'emerald') return 'fa-solid fa-cash-register';
  if (tone === 'violet') return 'fa-solid fa-user-group';
  if (tone === 'sky') return 'fa-solid fa-mobile-screen-button';
  return 'fa-solid fa-clock-rotate-left';
};

export default function RecentActivitiesWidget({ ctx, container }: DashboardWidgetProps) {
  const w = container.width || 0;
  const compact = w > 0 && w < 460;
  const pad = compact ? 'px-3 py-2.5' : 'px-4 py-3';
  const itemPad = compact ? 'p-2.5' : 'p-3';
  const avatar = compact ? 'h-9 w-9' : 'h-10 w-10';
  const titleCls = compact ? 'text-[12px]' : 'text-sm';
  const subCls = compact ? 'text-[11px]' : 'text-xs';
  const timeCls = compact ? 'text-[10px]' : 'text-[11px]';
  const activities = ctx.dashboardData?.recentActivities || [];

  const formatActivityTimestamp = (isoTimestamp: string) => moment(isoTimestamp).locale('fa').fromNow();

  return (
    <div data-ui-dashboard-widget-kind="recent-activities" className="dashboard-recent-activities-widget flex h-full flex-col overflow-hidden rounded-2xl bg-white dark:bg-slate-950">
      <div className={["dashboard-widget-local-header flex items-center justify-between border-b border-slate-200/80 text-right dark:border-slate-800", pad].join(' ')}>
        <div className="inline-flex items-center gap-2 text-[11px] font-black text-slate-500 dark:text-slate-400">
          <i className="fa-solid fa-clock-rotate-left" />
          آخرین رویدادها
        </div>
        <h3 className={[compact ? 'text-xs' : 'text-sm', 'font-black text-slate-900 dark:text-slate-100'].join(' ')}>فعالیت‌های اخیر</h3>
      </div>

      <div className="dashboard-widget-scrollarea min-h-0 flex-1 overflow-auto p-3">
        {ctx.showLoadingSkeletons ? (
          <div className="dashboard-widget-loading-state space-y-3">
            {Array.from({ length: compact ? 4 : 5 }).map((_, idx) => (
              <div key={idx} className="flex items-center gap-3 rounded-2xl border border-sky-100/80 bg-sky-50/70 p-3 dark:border-sky-900/40 dark:bg-sky-950/20">
                <Skeleton tone="info" className={`${avatar} shrink-0`} rounded="full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton tone="info" className="h-4 w-36" rounded="lg" />
                  <Skeleton tone="info" className="h-3 w-56 max-w-full" rounded="lg" />
                </div>
                <Skeleton tone="info" className="h-3 w-16 shrink-0" rounded="lg" />
              </div>
            ))}
          </div>
        ) : activities.length > 0 ? (
          <ul className="space-y-2">
            {activities.map((activity: ActivityItem) => {
              const tone = detectActivityTone(activity);
              return (
                <li key={activity.id} className={[itemPad, 'rounded-2xl border border-slate-200/80 bg-slate-50/70 transition-colors hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-900/65 dark:hover:border-slate-700 dark:hover:bg-slate-900'].join(' ')}>
                  <div className="flex items-center gap-3">
                    <div className={`flex-shrink-0 ${avatar} rounded-2xl border flex items-center justify-center shadow-sm ${toneClasses[tone]}`}>
                      <i className={`${safeActivityIcon(activity)} ${compact ? 'text-[14px]' : 'text-[15px]'}`} />
                    </div>

                    <div className="min-w-0 flex-1 text-right">
                      <p className={[titleCls, 'truncate font-black text-slate-900 dark:text-slate-100'].join(' ')}>{activity.typeDescription}</p>
                      <p className={[subCls, 'mt-0.5 truncate font-medium text-slate-500 dark:text-slate-400'].join(' ')}>{activity.details}</p>
                    </div>

                    <div className={[timeCls, 'shrink-0 rounded-full border border-slate-200 bg-white px-2 py-1 font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 whitespace-nowrap'].join(' ')}>
                      {formatActivityTimestamp(activity.timestamp)}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="dashboard-widget-empty-state flex h-full min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 text-center dark:border-slate-800 dark:bg-slate-900/60">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
              <i className="fa-solid fa-clock-rotate-left" />
            </div>
            <div className="mt-3 text-[12px] font-black text-slate-800 dark:text-slate-100">
              {!ctx.token && ctx.authReady ? 'برای مشاهده فعالیت‌ها وارد شوید' : 'فعالیت جدیدی ثبت نشده است'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
