import React from 'react';
import type { MetadataToShadowReadinessBridgePayload, MetadataToShadowReadinessBridgeRow } from './metadataImportDashboardTypes';
import { labelStatus, nf } from './metadataImportDashboardUtils';
const SHADOW_READINESS_BRIDGE_TECHNICAL_GUARD_ANCHORS = [
  'Metadata-to-Shadow Candidate Readiness Bridge',
  'بدون model execution، inference، activation، runtime record، observation یا mutation',
] as const;

const SHADOW_READINESS_BRIDGE_TECHNICAL_GUARD_ANCHORS_VALUE =
  SHADOW_READINESS_BRIDGE_TECHNICAL_GUARD_ANCHORS.join(' | ');


type Props = {
  open: boolean;
  shadowReadinessPayload: MetadataToShadowReadinessBridgePayload | null;
  shadowReadinessLoading: boolean;
  shadowReadinessError: string | null;
  onOpen: () => void;
};

const readinessLabel = (value?: MetadataToShadowReadinessBridgeRow['shadowCandidateReadiness']) => {
  if (value === 'ready_for_shadow_observation_metadata_only') return 'آماده برای برنامه‌ریزی Shadow';
  if (value === 'needs_metadata_review_before_shadow_observation') return 'نیازمند بازبینی متادیتا';
  if (value === 'blocked_from_shadow_observation_metadata_only') return 'فعلاً مسدود';
  return 'نامشخص';
};

function MetadataImportShadowReadinessBridgePanel({
  open,
  shadowReadinessPayload,
  shadowReadinessLoading,
  shadowReadinessError,
  onOpen,
}: Props) {
  if (!open) {
    return (
      <button type="button" onClick={onOpen} className="mlwb-v212-preview mt-4" aria-expanded={false} data-ml-readiness-bridge-anchor={SHADOW_READINESS_BRIDGE_TECHNICAL_GUARD_ANCHORS_VALUE}>
        <span className="mlwb-v212-preview__eyebrow text-sky-500">فاز 12A · جمع‌شده</span>
        <strong className="mlwb-v212-preview__title">پل آمادگی متادیتا به Shadow</strong>
        <span className="mlwb-v212-preview__desc">این بخش خلاصه آمادگی candidateها برای Shadow را نشان می‌دهد؛ فقط متادیتا است و نه runtime ساخته می‌شود، نه observation و نه inference.</span>
        <span className="mlwb-v212-preview__meta">
          <em className="mlwb-v212-chip not-italic"><i className="fa-solid fa-bridge" /> فقط readiness</em>
          <em className="mlwb-v212-chip not-italic"><i className="fa-solid fa-eye-slash" /> بدون runtime</em>
        </span>
      </button>
    );
  }

  const rows = (shadowReadinessPayload?.rows || []).slice(0, 4);
  const summary = shadowReadinessPayload?.summary;

  return (
    <div className="mlwb-v212-shell mt-4 rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/80" data-ml-readiness-bridge-anchor={SHADOW_READINESS_BRIDGE_TECHNICAL_GUARD_ANCHORS_VALUE}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold text-slate-900 dark:text-white">فاز 12A · پل آمادگی کاندیدها برای Shadow</p>
          <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">فقط آمادگی متادیتا بررسی می‌شود؛ بدون اجرای مدل، inference، activation، runtime record، observation یا mutation.</p>
        </div>
        <span className="mlwb-v212-kicker">{shadowReadinessLoading ? 'در حال دریافت…' : `وضعیت: ${labelStatus(summary?.status)}`}</span>
      </div>

      {shadowReadinessError && <p className="mt-3 rounded-2xl bg-rose-50 p-3 text-xs font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-200">{shadowReadinessError}</p>}

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 p-3 dark:border-slate-800"><p className="text-xs text-slate-500">کل کاندیدها</p><p className="text-lg font-black">{nf.format(summary?.candidateCount || 0)}</p></div>
        <div className="rounded-2xl border border-slate-200 p-3 dark:border-slate-800"><p className="text-xs text-slate-500">آماده</p><p className="text-lg font-black">{nf.format(summary?.readyCandidateCount || 0)}</p></div>
        <div className="rounded-2xl border border-slate-200 p-3 dark:border-slate-800"><p className="text-xs text-slate-500">نیازمند توجه</p><p className="text-lg font-black">{nf.format(summary?.watchCandidateCount || 0)}</p></div>
        <div className="rounded-2xl border border-slate-200 p-3 dark:border-slate-800"><p className="text-xs text-slate-500">مسدود</p><p className="text-lg font-black">{nf.format(summary?.blockedCandidateCount || 0)}</p></div>
      </div>

      <div className="mt-4 space-y-2">
        {rows.map((row) => (
          <div key={row.candidatePackageId || `${row.modelVersion}-${row.createdAt}`} className="rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-extrabold text-slate-900 dark:text-white">{row.candidatePackageId || 'بدون شناسه کاندید'}</p>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-extrabold text-slate-700 dark:bg-slate-900 dark:text-slate-200">{readinessLabel(row.shadowCandidateReadiness)}</span>
            </div>
            <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">{row.modelKey || 'model'} · {row.modelVersion || 'version'} · هشدار: {nf.format(row.warningCount || 0)} · خطا: {nf.format(row.errorCount || 0)} · فیلد ممنوع: {nf.format(row.forbiddenFieldCount || 0)}</p>
            {!!row.blockingReasons?.length && <p className="mt-2 text-xs font-bold text-amber-700 dark:text-amber-300">دلایل توقف: {row.blockingReasons.join('، ')}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default React.memo(MetadataImportShadowReadinessBridgePanel);
