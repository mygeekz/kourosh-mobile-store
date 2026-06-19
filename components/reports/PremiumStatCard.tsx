import React from 'react';

type Props = {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ReactNode;
  tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'info';
};

const toneClasses: Record<NonNullable<Props['tone']>, { ring: string; bg: string; text: string }> = {
  neutral: { ring: 'ring-slate-200/80 dark:ring-slate-800/80', bg: 'bg-white dark:bg-slate-950', text: 'text-text' },
  good: { ring: 'ring-slate-200/80 dark:ring-slate-800/80', bg: 'bg-white dark:bg-slate-950', text: 'text-emerald-700 dark:text-emerald-300' },
  warn: { ring: 'ring-slate-200/80 dark:ring-slate-800/80', bg: 'bg-white dark:bg-slate-950', text: 'text-amber-700 dark:text-amber-300' },
  bad: { ring: 'ring-slate-200/80 dark:ring-slate-800/80', bg: 'bg-white dark:bg-slate-950', text: 'text-rose-700 dark:text-rose-300' },
  info: { ring: 'ring-slate-200/80 dark:ring-slate-800/80', bg: 'bg-white dark:bg-slate-950', text: 'text-sky-700 dark:text-sky-300' },
};

const PremiumStatCard: React.FC<Props> = ({ label, value, hint, icon, tone = 'neutral' }) => {
  const t = toneClasses[tone];
  return (
    <div className={`premium-stat-card ${t.bg}`} data-tone={tone} data-ui-surface="kpi-card" data-ui-card="true" data-ui-card-kind="stat" dir="rtl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 text-right">
          <div className="premium-stat-card__label">{label}</div>
          <div className={`premium-stat-card__value ${t.text} truncate`}>{value}</div>
          {hint ? <div className="premium-stat-card__hint">{hint}</div> : null}
        </div>
        {icon ? (
          <div className="premium-stat-card__icon shrink-0">
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default PremiumStatCard;
