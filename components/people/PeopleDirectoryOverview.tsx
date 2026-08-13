import React from 'react';
import { Link } from 'react-router-dom';
import { IconGlyph, Surface } from '@/components/ui';

export type PeopleDirectoryTab = 'customers' | 'partners';
export type PeopleDirectoryTone = 'neutral' | 'accent' | 'info' | 'success' | 'warning' | 'danger';

export type PeopleDirectoryStat = {
  key: string;
  label: string;
  value: React.ReactNode;
  meta?: React.ReactNode;
  icon: string;
  tone?: PeopleDirectoryTone;
};

type PeopleDirectoryOverviewProps = {
  activeTab: PeopleDirectoryTab;
  eyebrow: string;
  title: string;
  subtitle: string;
  resultLabel: React.ReactNode;
  actions: React.ReactNode;
  quickStats: PeopleDirectoryStat[];
  metrics: PeopleDirectoryStat[];
  meta?: React.ReactNode;
  metricsLabel: string;
};

const statToneClass: Record<PeopleDirectoryTone, string> = {
  neutral: 'text-slate-500 dark:text-slate-300',
  accent: 'text-violet-600 dark:text-violet-300',
  info: 'text-blue-600 dark:text-blue-300',
  success: 'text-emerald-600 dark:text-emerald-300',
  warning: 'text-amber-600 dark:text-amber-300',
  danger: 'text-rose-600 dark:text-rose-300',
};

const tabClass = (active: boolean) => [
  'inline-flex min-h-10 min-w-[96px] items-center justify-center gap-2 rounded-[14px] px-4 text-[12px] font-black transition-colors',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30',
  active
    ? 'bg-slate-950 text-white shadow-sm dark:bg-slate-100 dark:text-slate-950'
    : 'text-slate-700 hover:bg-white hover:text-slate-950 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white',
].join(' ');

const PeopleDirectoryOverview: React.FC<PeopleDirectoryOverviewProps> = ({
  activeTab,
  eyebrow,
  title,
  subtitle,
  resultLabel,
  actions,
  quickStats,
  metrics,
  meta,
  metricsLabel,
}) => {
  return (
    <div className="grid min-w-0 gap-3" data-ui-people-directory-overview="shared">
      <Surface
        surface="glass"
        variant="panel"
        scheme="adaptive"
        wrapContent={false}
        className="!overflow-visible rounded-[24px] p-3 shadow-[0_18px_44px_-38px_rgba(15,23,42,0.28)] sm:p-4"
      >
        <div className="flex min-w-0 flex-col gap-3 border-b border-slate-200/80 pb-3 lg:flex-row lg:items-center lg:justify-between dark:border-slate-700/80">
          <nav
            className="inline-flex w-fit max-w-full items-center gap-1 rounded-[18px] border border-slate-200/90 bg-slate-50/80 p-1 dark:border-slate-700/90 dark:bg-slate-900/75"
            aria-label="بخش اشخاص"
          >
            <Link to="/customers" className={tabClass(activeTab === 'customers')} aria-current={activeTab === 'customers' ? 'page' : undefined}>
              <i className="fa-solid fa-user-group" aria-hidden="true" />
              <span>مشتریان</span>
            </Link>
            <Link to="/partners" className={tabClass(activeTab === 'partners')} aria-current={activeTab === 'partners' ? 'page' : undefined}>
              <i className="fa-solid fa-building" aria-hidden="true" />
              <span>همکاران</span>
            </Link>
          </nav>

          <div className="flex min-w-0 flex-wrap items-center gap-2 lg:justify-end">
            {actions}
          </div>
        </div>

        <div className="grid min-w-0 gap-4 pt-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(290px,0.72fr)] lg:items-stretch">
          <div className="flex min-w-0 flex-col items-start gap-2.5 py-1">
            <span className="inline-flex min-h-6 items-center rounded-full border border-blue-200/80 bg-blue-50/80 px-2.5 text-[10px] font-black text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200">
              {eyebrow}
            </span>

            <div className="flex min-w-0 flex-wrap items-center gap-2.5">
              <h2 className="text-[clamp(1.25rem,2.2vw,1.8rem)] font-black leading-tight tracking-[-0.02em] text-slate-950 dark:text-slate-50">
                {title}
              </h2>
              <span className="inline-flex min-h-7 items-center rounded-full border border-blue-200/80 bg-white/90 px-2.5 text-[10px] font-black text-blue-700 dark:border-blue-900/60 dark:bg-slate-900/90 dark:text-blue-200">
                {resultLabel}
              </span>
            </div>

            <p className="max-w-3xl text-[11px] font-semibold leading-7 text-slate-500 dark:text-slate-400 sm:text-[12px]">
              {subtitle}
            </p>

            {meta ? (
              <div className="mt-auto flex min-w-0 flex-wrap items-center gap-1.5 pt-1 text-[9px] font-bold text-slate-500 dark:text-slate-400">
                {meta}
              </div>
            ) : null}
          </div>

          <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {quickStats.map((item) => {
              const tone = item.tone || 'neutral';
              return (
                <article
                  key={item.key}
                  className="grid min-h-[104px] min-w-0 grid-cols-[38px_minmax(0,1fr)] items-center gap-3 rounded-[18px] border border-slate-200/80 bg-white/80 p-3.5 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.35)] dark:border-slate-700/80 dark:bg-slate-900/70"
                >
                  <IconGlyph size="lg" tone={tone} className={statToneClass[tone]}>
                    <i className={`fa-solid ${item.icon}`} aria-hidden="true" />
                  </IconGlyph>
                  <div className="min-w-0 text-right">
                    <span className="block text-[10px] font-black text-slate-500 dark:text-slate-400">{item.label}</span>
                    <strong className="mt-1 block break-words text-[clamp(0.96rem,1.55vw,1.28rem)] font-black leading-7 text-slate-950 dark:text-slate-50">
                      {item.value}
                    </strong>
                    {item.meta ? <small className="mt-0.5 block text-[9px] font-semibold leading-5 text-slate-500 dark:text-slate-400">{item.meta}</small> : null}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </Surface>

      <section
        className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
        aria-label={metricsLabel}
      >
        {metrics.map((item) => {
          const tone = item.tone || 'neutral';
          return (
            <article
              key={item.key}
              className="grid min-h-[78px] min-w-0 grid-cols-[32px_minmax(0,1fr)] items-center gap-3 rounded-[18px] border border-slate-200/80 bg-white/90 px-3 py-2.5 shadow-[0_12px_28px_-26px_rgba(15,23,42,0.35)] dark:border-slate-700/80 dark:bg-slate-900/80"
            >
              <IconGlyph size="md" tone={tone} className={statToneClass[tone]}>
                <i className={`fa-solid ${item.icon}`} aria-hidden="true" />
              </IconGlyph>
              <div className="min-w-0 text-right">
                <span className="block truncate text-[9px] font-black text-slate-600 dark:text-slate-300">{item.label}</span>
                <strong className="mt-0.5 block break-words text-[1.05rem] font-black leading-6 text-slate-950 dark:text-slate-50">{item.value}</strong>
                {item.meta ? <small className="mt-0.5 block truncate text-[8.5px] font-semibold text-slate-500 dark:text-slate-400">{item.meta}</small> : null}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
};

export default PeopleDirectoryOverview;
