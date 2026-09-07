import moment from 'jalali-moment';
import type { ActivityItem } from '../../../types';
import type { DashboardWidgetProps } from '../types';
import Skeleton from '../../../components/ui/Skeleton';
import DashboardWidgetHeader from '../DashboardWidgetHeader';
import OperationalWidgetLayout from '../OperationalWidgetLayout';

type ActivityTone = 'sky' | 'emerald' | 'amber' | 'rose' | 'violet' | 'neutral';

const detectActivityTone = (activity: ActivityItem): ActivityTone => {
  const text = `${activity.icon || ''} ${activity.typeDescription || ''} ${activity.details || ''}`.toLowerCase();
  if (/repair|screw|wrench|تعمیر|پذیرش/.test(text)) return 'rose';
  if (/install|invoice|check|قسط|اقساط|چک/.test(text)) return 'amber';
  if (/sale|cash|revenue|فروش|درآمد|نقد/.test(text)) return 'emerald';
  if (/customer|user|person|مشتری|اشخاص/.test(text)) return 'violet';
  if (/phone|mobile|product|گوشی|محصول|کالا/.test(text)) return 'sky';
  return 'neutral';
};

const safeActivityIcon = (activity: ActivityItem): string => {
  if (activity.icon && /^(fa|fas|far|fab|fal|fad)/.test(activity.icon)) return activity.icon;
  const tone = detectActivityTone(activity);
  if (tone === 'rose') return 'fa-solid fa-screwdriver-wrench';
  if (tone === 'amber') return 'fa-solid fa-file-invoice-dollar';
  if (tone === 'emerald') return 'fa-solid fa-cash-register';
  if (tone === 'violet') return 'fa-solid fa-user-group';
  if (tone === 'sky') return 'fa-solid fa-mobile-screen-button';
  return 'fa-solid fa-clock-rotate-left';
};

export default function RecentActivitiesWidget({ ctx, container }: DashboardWidgetProps) {
  const compact = (container.width || 0) > 0 && (container.width || 0) < 460;
  const activities = ctx.dashboardData?.recentActivities || [];

  return (
    <div data-ui-dashboard-widget-kind="recent-activities" className="app-dashboard-widget app-dashboard-activities">
      <OperationalWidgetLayout
        compact={compact}
        scrollLabel="فهرست فعالیت‌های اخیر"
        header={(
          <DashboardWidgetHeader
            title="فعالیت‌های اخیر"
            subtitle="آخرین رویدادهای ثبت‌شده"
            icon="fa-solid fa-clock-rotate-left"
            compact={compact}
          />
        )}
      >
        {ctx.showLoadingSkeletons ? (
          <div className="app-dashboard-list" aria-label="در حال دریافت فعالیت‌ها">
            {Array.from({ length: compact ? 4 : 5 }).map((_, index) => (
              <div key={index} className="app-dashboard-list-row app-dashboard-list-row--loading">
                <Skeleton tone="info" className="h-8 w-8 shrink-0" rounded="lg" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton tone="info" className="h-3 w-32" rounded="lg" />
                  <Skeleton tone="info" className="h-2.5 w-52 max-w-full" rounded="lg" />
                </div>
                <Skeleton tone="info" className="h-3 w-14 shrink-0" rounded="lg" />
              </div>
            ))}
          </div>
        ) : activities.length > 0 ? (
          <ul className="app-dashboard-list">
            {activities.map((activity: ActivityItem) => {
              const tone = detectActivityTone(activity);
              return (
                <li key={activity.id} className="app-dashboard-list-row">
                  <span className="app-dashboard-list-row__icon" data-tone={tone} aria-hidden="true">
                    <i className={safeActivityIcon(activity)} />
                  </span>
                  <span className="app-dashboard-list-row__content">
                    <span className="app-dashboard-list-row__title">{activity.typeDescription}</span>
                    <span className="app-dashboard-list-row__description">{activity.details}</span>
                  </span>
                  <time className="app-dashboard-list-row__time" dateTime={activity.timestamp}>
                    {moment(activity.timestamp).locale('fa').fromNow()}
                  </time>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="app-dashboard-empty">
            <span className="app-dashboard-empty__icon"><i className="fa-solid fa-clock-rotate-left" /></span>
            <strong>{!ctx.token && ctx.authReady ? 'برای مشاهده فعالیت‌ها وارد شوید' : 'فعالیت جدیدی ثبت نشده است'}</strong>
          </div>
        )}
      </OperationalWidgetLayout>
    </div>
  );
}
