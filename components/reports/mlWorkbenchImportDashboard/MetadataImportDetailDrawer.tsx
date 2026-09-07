import { Drawer } from '@/components/ui';
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
  return (
    <Drawer
      isOpen={Boolean(selectedCandidateId)}
      onClose={onClose}
      title="جزئیات اطلاعات مدل"
      kicker="جزئیات نتیجه ثبت‌شده"
      ariaDescription="این بخش جزئیات نتیجه ثبت‌شده، شاخص‌ها و وضعیت اطلاعات مدل را برای بررسی نمایش می‌دهد."
      iconClass="fa-solid fa-database"
      size="md"
      panelAttributes={{
        'data-report-drawer-kind': 'metadata-import',
      }}
    >
      {detailLoading ? (
        <p className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3 text-xs font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900">در حال دریافت جزئیات…</p>
      ) : detailError ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs font-bold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">{detailError}</p>
      ) : detail && selectedCandidateId ? (
        <>
          <div className="rounded-3xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
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

          <div className="grid gap-2">
            {(detail.sections || []).map((item) => (
              <div key={item.key} className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950/60">
                <span className="font-black text-slate-500">{item.label}</span>
                <span className="max-w-[60%] break-all text-left font-bold text-slate-800 dark:text-slate-100">{formatValue(item.value)}</span>
              </div>
            ))}
          </div>

          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-black text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
            فقط مشاهده · بدون تغییر خودکار اطلاعات فروشگاه
          </div>
        </>
      ) : (
        <p className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3 text-xs font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900">جزئیاتی برای این Candidate پیدا نشد.</p>
      )}
    </Drawer>
  );
}

export default React.memo(MetadataImportDetailDrawer);
