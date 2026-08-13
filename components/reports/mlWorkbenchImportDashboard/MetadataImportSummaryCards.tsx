import React from 'react';
import type { ImportResultSummary } from './metadataImportDashboardTypes';
import { labelStatus, nf } from './metadataImportDashboardUtils';

type Props = {
  loading: boolean;
  summary?: ImportResultSummary;
};

function MetadataImportSummaryCards({ loading, summary }: Props) {
  return (
    <div className="mt-4 grid gap-3 md:grid-cols-4">
      <article className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
        <small className="text-xs font-bold text-slate-500">وضعیت کلی</small>
        <strong className="mt-0.5 block text-base font-black text-slate-900 dark:text-white">{loading ? '…' : labelStatus(summary?.status)}</strong>
        <em className="not-italic text-xs text-slate-500">{summary?.phase || 'فاز 11D'}</em>
      </article>
      <article className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
        <small className="text-xs font-bold text-slate-500">تاریخچه ذخیره‌شده</small>
        <strong className="mt-1 block text-xl font-black text-slate-900 dark:text-white">{loading ? '…' : nf.format(summary?.historyCount || summary?.candidateCount || 0)}</strong>
        <em className="not-italic text-xs text-slate-500">ایمن: {nf.format(summary?.safeMetadataCandidateCount || 0)}</em>
      </article>
      <article className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
        <small className="text-xs font-bold text-slate-500">هشدار / خطا</small>
        <strong className="mt-1 block text-xl font-black text-slate-900 dark:text-white">{loading ? '…' : `${nf.format(summary?.totalWarningCount ?? summary?.warningCandidateCount ?? 0)} / ${nf.format(summary?.totalErrorCount ?? summary?.blockedCandidateCount ?? 0)}`}</strong>
        <em className="not-italic text-xs text-slate-500">بدون تغییر رکوردهای تجاری</em>
      </article>
      <article className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
        <small className="text-xs font-bold text-slate-500">آخرین اعتبارسنجی</small>
        <strong className="mt-1 block text-xl font-black text-slate-900 dark:text-white">{loading ? '…' : labelStatus(summary?.latestSafetyPolicyStatus || summary?.latestValidationStatus)}</strong>
        <em className="not-italic text-xs text-slate-500">چک‌سام: {labelStatus(summary?.latestChecksumStatus)}</em>
      </article>
    </div>
  );
}

export default React.memo(MetadataImportSummaryCards);
