import { formatExactNumberText } from '../../../utils/exactNumber';
import type { MlOperatorRouteResult } from '../../../services/mlOperatorOverviewApi';

const stateMeta: Record<MlOperatorRouteResult['state'], { label: string; className: string; icon: string }> = {
  ready: { label: 'آماده', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/35 dark:text-emerald-200 dark:ring-emerald-800', icon: 'fa-circle-check' },
  empty: { label: 'بدون داده', className: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700', icon: 'fa-circle-info' },
  unauthorized: { label: 'محدود', className: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/35 dark:text-amber-200 dark:ring-amber-800', icon: 'fa-lock' },
  unavailable: { label: 'ناموجود', className: 'bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-950/35 dark:text-orange-200 dark:ring-orange-800', icon: 'fa-triangle-exclamation' },
  error: { label: 'خطا', className: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/35 dark:text-rose-200 dark:ring-rose-800', icon: 'fa-circle-exclamation' },
};

const faNumber = (value: number): string => formatExactNumberText(value);

export function MlOperatorStatusChip({ state }: { state: MlOperatorRouteResult['state'] }) {
  const meta = stateMeta[state];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${meta.className}`}>
      <i className={`fa-solid ${meta.icon}`} />
      {meta.label}
    </span>
  );
}

export function MlOperatorStatusCards({ sources }: { sources: MlOperatorRouteResult[] }) {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label="کارت‌های وضعیت پایش هوشمند">
      {sources.slice(0, 4).map((source) => (
        <article
          key={source.key}
          className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_18px_44px_-38px_rgba(15,23,42,0.42)] dark:border-slate-800 dark:bg-slate-900/80"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-black text-slate-950 dark:text-white">{source.label}</div>
              <div className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{faNumber(source.count)} رکورد برگشتی</div>
            </div>
            <MlOperatorStatusChip state={source.state} />
          </div>
          <div className="mt-4 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500 ring-1 ring-slate-200 dark:bg-slate-950/40 dark:text-slate-300 dark:ring-slate-800">
            <span className="ml-1 font-black text-slate-700 dark:text-slate-100">شناسه آخر:</span>
            <span className="break-all">{source.latestId || 'ثبت نشده'}</span>
          </div>
        </article>
      ))}
    </section>
  );
}
