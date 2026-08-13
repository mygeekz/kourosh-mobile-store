import React from 'react';
import Button from '../Button';
import { FinancialTimelineEntry, type FinancialTimelineTone } from './FinancialTimeline';

export type FinancialTimelineEventLink = {
  label: React.ReactNode;
  onClick: () => void;
  iconClass?: string;
  title?: string;
  disabled?: boolean;
};

export type FinancialTimelineEventProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  source: React.ReactNode;
  sourceLabel?: React.ReactNode;
  amount: React.ReactNode;
  amountLabel?: React.ReactNode;
  amountTone?: FinancialTimelineTone;
  date: React.ReactNode;
  dateLabel?: React.ReactNode;
  status: React.ReactNode;
  statusLabel?: React.ReactNode;
  statusTone?: FinancialTimelineTone;
  deepLink?: FinancialTimelineEventLink | null;
  deepLinks?: FinancialTimelineEventLink[];
  deepLinkLabel?: React.ReactNode;
  marker?: React.ReactNode;
  markerTone?: FinancialTimelineTone;
  isLast?: boolean;
  compact?: boolean;
  actions?: React.ReactNode;
  badges?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  navigationAnchorId?: string;
};

const valueToneClassMap: Record<FinancialTimelineTone, string> = {
  neutral: 'text-slate-800 dark:text-slate-100',
  info: 'text-sky-700 dark:text-sky-200',
  success: 'text-emerald-700 dark:text-emerald-200',
  warning: 'text-amber-700 dark:text-amber-200',
  danger: 'text-rose-700 dark:text-rose-200',
};

const statusToneClassMap: Record<FinancialTimelineTone, string> = {
  neutral: 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
  info: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-200',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200',
  warning: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200',
  danger: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200',
};

type EventFieldProps = {
  label: React.ReactNode;
  children: React.ReactNode;
  valueClassName?: string;
};

const EventField: React.FC<EventFieldProps> = ({ label, children, valueClassName = '' }) => (
  <div className="min-w-0 px-3 py-2.5">
    <div className="text-[10px] font-black text-slate-400 dark:text-slate-500">{label}</div>
    <div className={`mt-1 min-w-0 text-[12px] font-black leading-6 ${valueClassName}`}>{children}</div>
  </div>
);

const FinancialTimelineEvent: React.FC<FinancialTimelineEventProps> = ({
  title,
  description,
  source,
  sourceLabel = 'منبع',
  amount,
  amountLabel = 'مبلغ',
  amountTone = 'neutral',
  date,
  dateLabel = 'تاریخ',
  status,
  statusLabel = 'وضعیت',
  statusTone = 'neutral',
  deepLink,
  deepLinks = [],
  deepLinkLabel = 'دسترسی‌ها',
  marker,
  markerTone = statusTone,
  isLast = false,
  compact = false,
  actions,
  badges,
  children,
  className = '',
  navigationAnchorId,
}) => {
  const resolvedDeepLinks = deepLinks.length > 0 ? deepLinks : deepLink ? [deepLink] : [];

  const eventNode = (
    <FinancialTimelineEntry
      marker={marker}
      markerTone={markerTone}
      isLast={isLast}
      compact={compact}
      className={className}
      contentClassName="!bg-white dark:!bg-slate-950/40"
    >
    <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 flex-1">
        <h5 className="min-w-0 break-words text-[13px] font-black leading-6 text-slate-950 dark:text-slate-50">{title}</h5>
        {description ? <div className="mt-1 text-[11px] font-semibold leading-5 text-slate-500 dark:text-slate-400">{description}</div> : null}
        {badges ? <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5">{badges}</div> : null}
      </div>
      {actions ? <div className="shrink-0 lg:max-w-[42%]">{actions}</div> : null}
    </div>

    <div className="mt-3 grid min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.15fr)_minmax(8rem,.8fr)_minmax(7rem,.75fr)_minmax(8rem,.8fr)_minmax(12rem,1.45fr)] dark:border-slate-800 dark:bg-slate-900/50 [&>div]:border-slate-200 sm:[&>div:nth-child(even)]:border-r xl:[&>div:nth-child(n+2)]:border-r dark:[&>div]:border-slate-800">
      <EventField label={sourceLabel} valueClassName="truncate text-slate-800 dark:text-slate-100">{source}</EventField>
      <EventField label={amountLabel} valueClassName={`whitespace-nowrap tabular-nums ${valueToneClassMap[amountTone]}`}>{amount}</EventField>
      <EventField label={dateLabel} valueClassName="whitespace-nowrap text-slate-800 dark:text-slate-100">{date}</EventField>
      <EventField label={statusLabel}>
        <span className={`inline-flex min-h-7 max-w-full items-center rounded-xl border px-2.5 py-1 text-[10px] font-black ${statusToneClassMap[statusTone]}`}>{status}</span>
      </EventField>
      <EventField label={deepLinkLabel}>
        {resolvedDeepLinks.length > 0 ? (
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            {resolvedDeepLinks.map((link, index) => (
              <Button
                key={`${String(link.title || link.label || 'source')}-${index}`}
                type="button"
                variant={index === 0 ? 'secondary' : 'ghost'}
                size="xs"
                onClick={link.onClick}
                disabled={link.disabled}
                title={link.title}
                leftIcon={<i className={link.iconClass || 'fa-solid fa-arrow-up-right-from-square'} />}
                className="max-w-full"
              >
                <span className="truncate">{link.label}</span>
              </Button>
            ))}
          </div>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500">
            <i className="fa-solid fa-link-slash" aria-hidden="true" />
            بدون لینک مستقیم
          </span>
        )}
      </EventField>
    </div>

      {children ? <div className="mt-3 border-t border-dashed border-slate-200 pt-3 dark:border-slate-800">{children}</div> : null}
    </FinancialTimelineEntry>
  );

  if (!navigationAnchorId) return eventNode;

  return (
    <div
      data-navigation-anchor={navigationAnchorId}
      data-navigation-return-highlight="false"
      className="scroll-mt-24 rounded-[20px] transition data-[navigation-return-highlight=true]:ring-2 data-[navigation-return-highlight=true]:ring-amber-400/80 data-[navigation-return-highlight=true]:ring-offset-2 data-[navigation-return-highlight=true]:ring-offset-slate-50 dark:data-[navigation-return-highlight=true]:ring-amber-300/80 dark:data-[navigation-return-highlight=true]:ring-offset-slate-950"
    >
      {eventNode}
    </div>
  );
};

export default FinancialTimelineEvent;
