import React from 'react';
import type { ImportResultDetail } from './metadataImportDashboardTypes';
import { formatMetric, formatValue, labelStatus, nf } from './metadataImportDashboardUtils';

type Props = {
  selectedCandidateId: string | null;
  detail: ImportResultDetail | null;
  detailLoading: boolean;
  detailError?: string | null;
  onClose: () => void;
};

function MetadataImportDetailDrawer({ selectedCandidateId, detail, detailLoading, detailError, onClose }: Props) {
  if (!selectedCandidateId) return null;
  return (
    <div className="fixed inset-0 z-50 flex min-h-0 justify-end overflow-hidden bg-slate-950/40 p-0 backdrop-blur-sm sm:p-3" role="dialog" aria-modal="true" aria-label="Metadata import detail drawer" data-report-drawer-frame="metadata-import">
      <aside className="flex h-dvh max-h-dvh min-h-0 w-full max-w-xl flex-col overflow-y-auto overscroll-contain rounded-none border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:h-full sm:rounded-[28px] sm:p-4" data-report-drawer-surface="true">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-500">Phase 11D · Read-only detail · Persisted</span>
            <h4 className="mt-1 text-lg font-black text-slate-950 dark:text-white">جزئیات متادیتای Candidate</h4>
            <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">این drawer جزئیات persisted metadata import result را با snapshot خلاصه‌شده باز می‌کند؛ raw CSV، model binary، execute، inference، activate یا تغییر تجاری نمایش/اجرا نمی‌شود.</p>
          </div>
          <button type="button" className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 dark:border-slate-700 dark:text-slate-200" onClick={onClose}>
            <i className="fa-solid fa-xmark ml-1" /> بستن
          </button>
        </div>

        {detailLoading ? (
          <p className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3 text-xs font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900">در حال دریافت جزئیات متادیتا…</p>
        ) : detailError ? (
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs font-bold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">{detailError}</p>
        ) : detail ? (
          <>
            <div className="mt-4 rounded-3xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
              <small className="text-xs font-bold text-slate-500">Candidate package ID</small>
              <strong className="mt-1 block break-all text-sm font-black text-slate-900 dark:text-white">{detail.candidatePackageId || selectedCandidateId}</strong>
              <div className="mt-3 grid gap-2 text-xs font-bold text-slate-500 md:grid-cols-2 dark:text-slate-400">
                <span>Model: {detail.modelVersion || detail.modelKey || '—'}</span>
                <span>Score: {formatMetric(detail.comparisonScore, detail.comparisonBasis)}</span>
                <span>Import: {labelStatus(detail.metadataImportStatus || detail.validationStatus)}</span>
                <span>Safety: {labelStatus(detail.safetyPolicyStatus)}</span>
                <span>Warnings: {nf.format(detail.warningCount || 0)}</span>
                <span>Forbidden: {nf.format(detail.forbiddenFieldCount || 0)}</span>
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              {(detail.sections || []).map((item) => (
                <div key={item.key} className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950/60">
                  <span className="font-black text-slate-500">{item.label}</span>
                  <span className="max-w-[60%] break-all text-left font-bold text-slate-800 dark:text-slate-100">{formatValue(item.value)}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-black text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
              Metadata only · No model execution · No inference · No activation · No business mutation · No governance workflow
            </div>
          </>
        ) : (
          <p className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3 text-xs font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900">جزئیاتی برای این Candidate پیدا نشد.</p>
        )}
      </aside>
    </div>
  );
}

export default React.memo(MetadataImportDetailDrawer);
