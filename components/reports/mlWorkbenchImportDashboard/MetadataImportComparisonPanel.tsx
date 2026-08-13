import React from 'react';
import type { OfflineMetricsComparisonPayload } from './metadataImportDashboardTypes';
import { formatMetric, labelStatus, nf } from './metadataImportDashboardUtils';

type Props = {
  open: boolean;
  comparisonPayload: OfflineMetricsComparisonPayload | null;
  comparisonLoading: boolean;
  comparisonError?: string | null;
  onOpen: () => void;
};

function MetadataImportComparisonPanel({ open, comparisonPayload, comparisonLoading, comparisonError, onOpen }: Props) {
  const comparisonSummary = comparisonPayload?.summary;
  const comparisonRows = (comparisonPayload?.rows || []).slice(0, 3);

  if (!open) {
    return (
      <button type="button" className="mlwb-v212-preview mt-4" aria-label="پیش‌نمایش پنل مقایسه متریک‌های آفلاین" aria-expanded={false} onClick={onOpen}>
        <span className="mlwb-v212-preview__eyebrow text-indigo-500">فاز 11E · جمع‌شده</span>
        <strong className="mlwb-v212-preview__title">مقایسه متریک‌های آفلاین</strong>
        <span className="mlwb-v212-preview__desc">این پنل فعلاً بسته است. با باز کردن آن فقط اسنپ‌شات‌های متادیتا با نتایج آفلاین مقایسه می‌شوند؛ نه آرتیفکتی اجرا می‌شود و نه inference فعال می‌گردد.</span>
        <span className="mlwb-v212-preview__meta">
          <em className="mlwb-v212-chip not-italic"><i className="fa-solid fa-scale-balanced" /> فقط خواندنی</em>
          <em className="mlwb-v212-chip not-italic"><i className="fa-solid fa-arrow-up-right-dots" /> بدون اجرای مدل</em>
        </span>
      </button>
    );
  }

  return (
    <div className="mlwb-v212-shell mt-4 rounded-[24px] border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900" aria-label="فاز 11E مقایسه متریک‌های آفلاین">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <span className="text-[11px] font-black tracking-[0.08em] text-indigo-500">فاز 11E · مقایسه متریک‌های آفلاین</span>
          <h4 className="mt-1 text-sm font-black text-slate-950 dark:text-white">مقایسه متادیتای ذخیره‌شده با نتایج آفلاین</h4>
          <p className="mt-1 text-xs font-bold leading-6 text-slate-500 dark:text-slate-400">این بخش فقط summaryهای ذخیره‌شده را با snapshot امن workbench مقایسه می‌کند؛ نه مدل اجرا می‌شود، نه آرتیفکت فعال می‌شود و نه رکورد تجاری تغییر می‌کند.</p>
        </div>
        <div className="mlwb-v212-kicker">{comparisonLoading ? 'در حال بررسی…' : `وضعیت: ${labelStatus(comparisonSummary?.status)}`}</div>
      </div>

      <div className="mlwb-v212-mini-grid mt-3 md:grid-cols-4">
        <article className="rounded-2xl border border-slate-100 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-950/60"><small className="text-xs font-bold text-slate-500">متریک‌های هم‌خوان</small><strong className="mt-0.5 block text-base font-black text-slate-900 dark:text-white">{comparisonLoading ? '…' : nf.format(comparisonSummary?.metricMatchCount || 0)}</strong></article>
        <article className="rounded-2xl border border-slate-100 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-950/60"><small className="text-xs font-bold text-slate-500">اختلاف</small><strong className="mt-0.5 block text-base font-black text-slate-900 dark:text-white">{comparisonLoading ? '…' : nf.format(comparisonSummary?.metricDriftCount || 0)}</strong></article>
        <article className="rounded-2xl border border-slate-100 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-950/60"><small className="text-xs font-bold text-slate-500">کمبود داده</small><strong className="mt-0.5 block text-base font-black text-slate-900 dark:text-white">{comparisonLoading ? '…' : nf.format(comparisonSummary?.missingMetricCount || 0)}</strong></article>
        <article className="rounded-2xl border border-slate-100 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-950/60"><small className="text-xs font-bold text-slate-500">بیشترین فاصله</small><strong className="mt-1 block text-lg font-black text-slate-900 dark:text-white">{comparisonLoading ? '…' : formatMetric(comparisonSummary?.maxAbsDelta)}</strong></article>
      </div>

      {comparisonError ? <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">{comparisonError}</p> : null}

      {comparisonRows.length ? (
        <div className="mt-3 grid gap-2">
          {comparisonRows.map((row, index) => (
            <div key={`${row.candidatePackageId || index}-offline-metrics`} className="rounded-2xl border border-slate-100 bg-white px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex items-start justify-between gap-3">
                <strong className="break-all font-black text-slate-800 dark:text-white">{row.candidatePackageId || row.modelVersion || '—'}</strong>
                <span className="font-black text-slate-500">{labelStatus(row.comparisonStatus)}</span>
              </div>
              <p className="mt-1 font-bold leading-6 text-slate-500 dark:text-slate-400">هم‌خوان: {nf.format(row.metricMatchCount || 0)} · اختلاف: {nf.format(row.metricDriftCount || 0)} · کمبود: {nf.format((row.missingPersistedMetricCount || 0) + (row.missingOfflineMetricCount || 0))} · بیشترین فاصله: {formatMetric(row.maxAbsDelta)}</p>
            </div>
          ))}
        </div>
      ) : !comparisonLoading ? <p className="mt-3 rounded-2xl border border-slate-100 bg-white px-3 py-2 text-xs font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">هنوز نتیجه ذخیره‌شده‌ای برای مقایسه با snapshot آفلاین وجود ندارد.</p> : null}
    </div>
  );
}

export default React.memo(MetadataImportComparisonPanel);
