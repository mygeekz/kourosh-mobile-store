import React from 'react';
import Surface from './Surface';
import { cn } from '../../utils/cn';

export type ManagementTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'accent';

const toneTextClass: Record<ManagementTone, string> = {
  neutral: 'text-slate-500 dark:text-slate-400',
  info: 'text-sky-600 dark:text-sky-300',
  success: 'text-emerald-600 dark:text-emerald-300',
  warning: 'text-amber-600 dark:text-amber-300',
  danger: 'text-rose-600 dark:text-rose-300',
  accent: 'text-violet-600 dark:text-violet-300',
};

export type ManagementQuickStat = {
  key: string;
  label: string;
  value: React.ReactNode;
  meta?: React.ReactNode;
  icon: string;
  tone?: ManagementTone;
};

export type ManagementKpiItem = {
  key: string;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon: string;
  tone?: ManagementTone;
};

type HeroProps = {
  eyebrow: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  meta?: React.ReactNode;
  navigation?: React.ReactNode;
  actions?: React.ReactNode;
  quickStats?: ManagementQuickStat[];
  className?: string;
};

export const ManagementDirectoryHero: React.FC<HeroProps> = ({
  eyebrow,
  title,
  description,
  badge,
  meta,
  navigation,
  actions,
  quickStats = [],
  className,
}) => (
  <Surface
    surface="glass"
    variant="panel"
    scheme="adaptive"
    wrapContent={false}
    className={cn('overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 shadow-sm dark:border-slate-800 dark:bg-slate-950/90', className)}
    data-ui-management-hero="true"
  >
    {(navigation || actions) ? (
      <div className="flex flex-col gap-3 border-b border-slate-200/80 px-3 py-3 sm:px-4 lg:flex-row lg:items-center lg:justify-between dark:border-slate-800" data-ui-management-hero-actions="true">
        <div className="flex min-w-0 flex-wrap items-center gap-2">{navigation}</div>
        <div className="flex min-w-0 flex-wrap items-center gap-2">{actions}</div>
      </div>
    ) : null}

    <div className="grid grid-cols-1 gap-4 p-3 sm:p-4 lg:grid-cols-3 lg:items-center lg:p-5">
      <div className="space-y-2 lg:col-span-2">
        <span className="inline-flex w-fit items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          {eyebrow}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="m-0 text-xl font-black tracking-tight text-slate-950 sm:text-2xl dark:text-white">{title}</h2>
          {badge ? (
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
              {badge}
            </span>
          ) : null}
        </div>
        {description ? <p className="m-0 max-w-3xl text-xs leading-6 text-slate-500 sm:text-sm dark:text-slate-400">{description}</p> : null}
        {meta ? <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{meta}</div> : null}
      </div>

      {quickStats.length ? (
        <div className={cn('grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1', quickStats.length > 2 && 'xl:grid-cols-2')} data-ui-management-quick-stats="true">
          {quickStats.map((item) => {
            const tone = item.tone ?? 'neutral';
            return (
              <div key={item.key} className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/60">
                <span data-ui-icon-surface="bare" className={cn('inline-flex h-8 w-8 shrink-0 items-center justify-center border-0 bg-transparent text-sm shadow-none', toneTextClass[tone])} aria-hidden="true">
                  <i className={item.icon} />
                </span>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{item.label}</div>
                  <div className="truncate text-base font-black text-slate-950 dark:text-white">{item.value}</div>
                  {item.meta ? <div className="text-[10px] leading-4 text-slate-500 dark:text-slate-400">{item.meta}</div> : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  </Surface>
);

type KpiGridProps = {
  items: ManagementKpiItem[];
  className?: string;
};

export const ManagementKpiGrid: React.FC<KpiGridProps> = ({ items, className }) => (
  <section
    className={cn('grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5', className)}
    aria-label="خلاصه مدیریتی"
    data-ui-management-kpis="true"
  >
    {items.map((item) => {
      const tone = item.tone ?? 'neutral';
      return (
        <article key={item.key} className="flex min-h-24 items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-3 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{item.label}</div>
            <strong className="mt-1 block truncate text-2xl font-black text-slate-950 dark:text-white">{item.value}</strong>
            {item.hint ? <small className="mt-1 block truncate text-[10px] text-slate-500 dark:text-slate-400">{item.hint}</small> : null}
          </div>
          <span data-ui-icon-surface="bare" className={cn('inline-flex h-8 w-8 shrink-0 items-center justify-center border-0 bg-transparent text-sm shadow-none', toneTextClass[tone])} aria-hidden="true">
            <i className={item.icon} />
          </span>
        </article>
      );
    })}
  </section>
);

type FilterProps = {
  children: React.ReactNode;
  className?: string;
};

export const ManagementFilterSurface: React.FC<FilterProps> = ({ children, className }) => (
  <Surface
    surface="glass"
    variant="panel"
    scheme="adaptive"
    wrapContent={false}
    className={cn('rounded-2xl border border-slate-200/80 bg-white/95 p-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-950/90 sm:p-3', className)}
    data-ui-management-filters="true"
  >
    {children}
  </Surface>
);

type ListSurfaceProps = {
  title: React.ReactNode;
  meta?: React.ReactNode;
  info?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
};

export const ManagementListSurface: React.FC<ListSurfaceProps> = ({
  title,
  meta,
  info,
  actions,
  children,
  className,
  bodyClassName,
}) => (
  <Surface
    surface="glass"
    variant="panel"
    scheme="adaptive"
    wrapContent={false}
    className={cn('overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-sm dark:border-slate-800 dark:bg-slate-950/90', className)}
    data-ui-management-list="true"
  >
    <header className="flex flex-col gap-2 border-b border-slate-200/80 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 dark:border-slate-800">
      <div className="min-w-0">
        <h3 className="m-0 text-sm font-black text-slate-950 dark:text-white">{title}</h3>
        {meta ? <p className="m-0 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{meta}</p> : null}
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
        {info ? <span className="inline-flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">{info}</span> : null}
        {actions}
      </div>
    </header>
    <div className={cn('min-w-0 max-w-full p-2 sm:p-3', bodyClassName)}>{children}</div>
  </Surface>
);
