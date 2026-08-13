import React from 'react';
import type { TrendRegressionPayload } from './metadataImportDashboardTypes';
import { formatMetric, labelStatus, nf } from './metadataImportDashboardUtils';

type Props = {
  open: boolean;
  trendPayload: TrendRegressionPayload | null;
  trendLoading: boolean;
  trendError?: string | null;
  onOpen: () => void;
};

function MetadataImportTrendRegressionPanel({ open, trendPayload, trendLoading, trendError, onOpen }: Props) {
  const trendSummary = trendPayload?.summary;
  const trendRows = (trendPayload?.rows || []).slice(0, 3);

  if (!open) {
    return (
      <button type="button" className="mlwb-v212-preview mt-4" aria-label="پیش‌نمایش پنل روند و رگرسیون" aria-expanded={false} onClick={onOpen}>
        <span className="mlwb-v212-preview__eyebrow text-rose-500">فاز 11F · جمع‌شده</span>
        <strong className="mlwb-v212-preview__title">خلاصه روند و رگرسیون</strong>
        <span className="mlwb-v212-preview__desc">پنل سیگنال‌های روند فعلاً بسته است. با باز کردن آن فقط history ذخیره‌شده تحلیل می‌شود و هیچ mutation یا اجرای مدل رخ نمی‌دهد.</span>
        <span className="mlwb-v212-preview__meta">
          <em className="mlwb-v212-chip not-italic"><i className="fa-solid fa-wave-square" /> تحلیل تاریخچه</em>
          <em className="mlwb-v212-chip not-italic"><i className="fa-solid fa-lock" /> بدون تغییر داده</em>
        </span>
      </button>
    );
  }

  return (
    <div className="mlwb-v212-shell mt-4 rounded-[24px] border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900" aria-label="فاز 11F روند و رگرسیون">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <span className="text-[11px] font-black tracking-[0.08em] text-rose-500">فاز 11F · خلاصه روند و رگرسیون</span>
          <h4 className="mt-1 text-sm font-black text-slate-950 dark:text-white">سیگنال‌های روند از تاریخچه ذخیره‌شده</h4>
          <p className="mt-1 text-xs font-bold leading-6 text-slate-500 dark:text-slate-400">این بخش فقط history نتایج import متادیتا را بررسی می‌کند؛ افت metric، افزایش warning/error و تغییرات مهم را بدون اجرای مدل یا تغییر عملیاتی نشان می‌دهد.</p>
        </div>
        <div className="mlwb-v212-kicker">{trendLoading ? 'در حال تحلیل…' : `وضعیت: ${labelStatus(trendSummary?.status)}`}</div>
      </div>
      <div className="mlwb-v212-mini-grid mt-3 md:grid-cols-4">
        <article className="rounded-2xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/60"><small className="text-xs font-bold text-slate-500">تغییرات بررسی‌شده</small><strong className="mt-1 block text-lg font-black text-slate-900 dark:text-white">{trendLoading ? '…' : nf.format(trendSummary?.analyzedTransitionCount || 0)}</strong><em className="not-italic text-xs text-slate-500">تاریخچه: {nf.format(trendSummary?.historyCount || 0)}</em></article>
        <article className="rounded-2xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/60"><small className="text-xs font-bold text-slate-500">سیگنال‌های رگرسیون</small><strong className="mt-1 block text-lg font-black text-slate-900 dark:text-white">{trendLoading ? '…' : nf.format(trendSummary?.regressionMetricCount || 0)}</strong><em className="not-italic text-xs text-slate-500">کاندیدها: {nf.format(trendSummary?.regressionCandidateCount || 0)}</em></article>
        <article className="rounded-2xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/60"><small className="text-xs font-bold text-slate-500">افزایش هشدار / خطا</small><strong className="mt-1 block text-lg font-black text-slate-900 dark:text-white">{trendLoading ? '…' : `${nf.format(trendSummary?.warningIncreaseCount || 0)} / ${nf.format(trendSummary?.errorIncreaseCount || 0)}`}</strong><em className="not-italic text-xs text-slate-500">فیلد ممنوع: {nf.format(trendSummary?.forbiddenFieldIncreaseCount || 0)}</em></article>
        <article className="rounded-2xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/60"><small className="text-xs font-bold text-slate-500">بیشترین افت متریک</small><strong className="mt-1 block text-lg font-black text-slate-900 dark:text-white">{trendLoading ? '…' : formatMetric(trendSummary?.maxMetricDrop)}</strong><em className="not-italic text-xs text-slate-500">آخرین نسخه: {trendSummary?.latestModelVersion || '—'}</em></article>
      </div>
      {trendError ? <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">{trendError}</p> : null}
      {trendRows.length ? (
        <div className="mt-3 grid gap-2">
          {trendRows.map((row, index) => (
            <div key={`${row.candidatePackageId || index}-trend-regression`} className="rounded-2xl border border-slate-100 bg-white px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex items-start justify-between gap-3"><strong className="break-all font-black text-slate-800 dark:text-white">{row.candidatePackageId || row.modelVersion || '—'}</strong><span className="font-black text-slate-500">{labelStatus(row.trendStatus)}</span></div>
              <p className="mt-1 font-bold leading-6 text-slate-500 dark:text-slate-400">رگرسیون: {nf.format(row.regressionSignalCount || 0)} · بهبود: {nf.format(row.improvementSignalCount || 0)} · Δ هشدار: {nf.format(row.warningDelta || 0)} · Δ خطا: {nf.format(row.errorDelta || 0)} · بیشترین افت: {formatMetric(row.maxMetricDrop)}</p>
            </div>
          ))}
        </div>
      ) : !trendLoading ? <p className="mt-3 rounded-2xl border border-slate-100 bg-white px-3 py-2 text-xs font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">برای نمایش سیگنال روند، حداقل دو نتیجه ذخیره‌شده از یک مدل یا نوع پیش‌بینی لازم است.</p> : null}
    </div>
  );
}

export default React.memo(MetadataImportTrendRegressionPanel);
