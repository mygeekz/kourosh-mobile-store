import React from 'react';
import { Link } from 'react-router-dom';
import ManagementDirectoryOverview, {
  type ManagementDirectoryOverviewStat,
  type ManagementDirectoryOverviewTone,
} from '@/components/ui/ManagementDirectoryOverview';

export type PeopleDirectoryTab = 'customers' | 'partners';
export type PeopleDirectoryTone = ManagementDirectoryOverviewTone;
export type PeopleDirectoryStat = ManagementDirectoryOverviewStat;

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
}) => (
  <div data-ui-people-directory-overview="shared">
    <ManagementDirectoryOverview
    eyebrow={eyebrow}
    title={title}
    subtitle={subtitle}
    resultLabel={resultLabel}
    actions={actions}
    quickStats={quickStats}
    metrics={metrics}
    meta={meta}
    metricsLabel={metricsLabel}
    navigation={(
      <nav
        className="inline-flex w-full max-w-[13rem] shrink-0 self-start items-center gap-1 rounded-[18px] border border-slate-200/90 bg-slate-50/80 p-1 dark:border-slate-700/90 dark:bg-slate-900/75 [&>a]:min-w-0 [&>a]:flex-1 [&>a]:px-3"
        aria-label="بخش اشخاص"
        data-ui-people-directory-tabs="true"
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
    )}
    />
  </div>
);

export default PeopleDirectoryOverview;
