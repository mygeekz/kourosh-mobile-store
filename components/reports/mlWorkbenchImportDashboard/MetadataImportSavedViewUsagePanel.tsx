import React from 'react';
import type { AnnotationSavedViewId, AnnotationSavedViewUsagePayload, AnnotationSavedViewUsageRow } from './metadataImportDashboardTypes';
import { formatValue, labelStatus, nf } from './metadataImportDashboardUtils';

type Props = {
  savedViewUsagePayload: AnnotationSavedViewUsagePayload | null;
  savedViewUsageRows: AnnotationSavedViewUsageRow[];
  savedViewUsageLoading: boolean;
  savedViewUsageError?: string | null;
  onApplySavedView: (presetId: AnnotationSavedViewId | string) => void;
};

function MetadataImportSavedViewUsagePanel({ savedViewUsagePayload, savedViewUsageRows, savedViewUsageLoading, savedViewUsageError, onApplySavedView }: Props) {
  const savedViewUsageSummary = savedViewUsagePayload?.summary;
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/60" aria-label="Phase 11J saved view usage summary">
      <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
        <div>
          <strong className="text-xs font-black text-slate-800 dark:text-white">Phase 11J · Saved View Usage Summary</strong>
          <p className="mt-1 text-[11px] font-bold text-slate-500">Read-only coverage summary for quick presets; no clickstream, no personal behavior tracking, no mutation.</p>
        </div>
        <span className="rounded-2xl border border-slate-200 px-3 py-2 text-[11px] font-black text-slate-500 dark:border-slate-700">{savedViewUsageLoading ? 'Analyzing…' : labelStatus(savedViewUsageSummary?.status)}</span>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-4">
        <article className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900"><small className="text-xs font-bold text-slate-500">Useful presets</small><strong className="mt-1 block text-lg font-black text-slate-900 dark:text-white">{savedViewUsageLoading ? '…' : nf.format(savedViewUsageSummary?.nonEmptySavedViewCount || 0)}</strong></article>
        <article className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900"><small className="text-xs font-bold text-slate-500">Attention presets</small><strong className="mt-1 block text-lg font-black text-slate-900 dark:text-white">{savedViewUsageLoading ? '…' : nf.format(savedViewUsageSummary?.attentionSavedViewCount || 0)}</strong></article>
        <article className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900"><small className="text-xs font-bold text-slate-500">Top preset</small><strong className="mt-1 block truncate text-sm font-black text-slate-900 dark:text-white">{savedViewUsageLoading ? '…' : savedViewUsageSummary?.topPresetLabel || '—'}</strong></article>
        <article className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900"><small className="text-xs font-bold text-slate-500">Behavior stored</small><strong className="mt-1 block text-lg font-black text-slate-900 dark:text-white">No</strong></article>
      </div>
      {savedViewUsageError ? <p className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">{savedViewUsageError}</p> : null}
      {savedViewUsageRows.length ? (
        <div className="mt-3 grid gap-2">
          {savedViewUsageRows.map((row) => (
            <button key={`${row.presetId || row.label}-usage`} type="button" className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-right text-xs transition hover:-translate-y-0.5 dark:border-slate-800 dark:bg-slate-900" onClick={() => row.presetId ? onApplySavedView(row.presetId) : undefined}>
              <span className="flex items-start justify-between gap-3"><strong className="font-black text-slate-800 dark:text-white">#{nf.format(row.rank || 0)} · {row.label || row.presetId || '—'}</strong><em className="not-italic font-black text-slate-500">{nf.format(row.matchedAnnotationCount || 0)} matches</em></span>
              <span className="mt-1 block font-bold text-slate-500 dark:text-slate-400">{row.filterSignature || 'all_annotations'} · Score: {formatValue(row.usefulnessScore)} · {labelStatus(row.usageSignal)}</span>
            </button>
          ))}
        </div>
      ) : !savedViewUsageLoading ? <p className="mt-2 text-xs font-bold text-slate-500">هنوز coverage مفیدی برای presetها پیدا نشد؛ این فقط summary خواندنی است و رفتار کاربر ذخیره نمی‌کند.</p> : null}
    </div>
  );
}

export default React.memo(MetadataImportSavedViewUsagePanel);
