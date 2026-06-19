import React from 'react';

type Props = {
  label: string;
  value: string;
  icon?: string;
  hint?: string;
};

export default function ModernKpiCard({ label, value, icon, hint }: Props) {
  return (
    <div className="modern-kpi-card group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.05)] dark:border-slate-800/80 dark:bg-slate-950" data-ui-surface="kpi-card" data-ui-card="true" data-ui-card-kind="kpi" dir="rtl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</div>
          <div className="mt-1 truncate text-lg font-extrabold text-slate-900 dark:text-slate-100">{value}</div>
          {hint ? <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</div> : null}
        </div>
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-700 ring-1 ring-slate-200/70 transition group-hover:scale-[1.02] dark:bg-white/5 dark:text-slate-200 dark:ring-white/10">
          <i className={icon ?? 'fa-solid fa-star'} />
        </div>
      </div>
    </div>
  );
}
