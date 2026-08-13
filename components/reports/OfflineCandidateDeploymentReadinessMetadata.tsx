import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../utils/apiFetch';

type Props = { metadataImportId: number | null; onClear: () => void };
type Check = { key: string; label: string; status: string; source?: string; message?: string; earned?: number; weight?: number };
type Signal = { key: string; family: string; label: string; status: string; source?: string; score?: number | null; message?: string };
type Summary = {
  status?: string;
  deploymentReadinessScorePct?: number;
  completenessScorePct?: number;
  safetyScorePct?: number;
  metricsCoverageScorePct?: number;
  calibrationCoverageScorePct?: number;
  errorAnalysisCoverageScorePct?: number;
  robustnessCoverageScorePct?: number;
  limitationCount?: number;
  readinessSignalCount?: number;
  passCount?: number;
  warningCount?: number;
  failCount?: number;
  recommendedNextAction?: string;
};
type Payload = { summary?: Summary; checks?: Check[]; readinessSignals?: Signal[]; deploymentReadinessMetadataPreview?: Record<string, unknown> };

const nf = new Intl.NumberFormat('fa-IR');
const formatScore = (value: unknown) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? `${nf.format((numberValue))}٪` : '—';
};
const statusLabel = (value?: string | null) => {
  const text = String(value || '').trim();
  if (!text) return '—';
  if (text.includes('ready') || text === 'pass') return 'آماده بررسی';
  if (text.includes('warning')) return 'نیازمند تکمیل';
  if (text.includes('fail') || text.includes('block')) return 'مسدود';
  if (text.includes('missing')) return 'فاقد metadata';
  return text;
};
const compactJson = (value: unknown) => JSON.stringify(value || {}, null, 2);

function OfflineCandidateDeploymentReadinessMetadata({ metadataImportId, onClear }: Props) {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!metadataImportId) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch(`/api/brain/ml-datasets/inventory-stockout/candidate-deployment-readiness-metadata/${metadataImportId}`);
        const json = await res.json().catch(() => null);
        if (!res.ok || json?.success === false) throw new Error(json?.message || 'خطا در دریافت deployment readiness metadata');
        if (active) setPayload(json?.data || null);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'خطا در دریافت deployment readiness metadata');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [metadataImportId]);

  const summary = payload?.summary;
  const checks = useMemo(() => payload?.checks || [], [payload]);
  const signals = useMemo(() => payload?.readinessSignals || [], [payload]);
  if (!metadataImportId) return null;

  return (
    <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white">Deployment readiness metadata</h3>
          <p className="text-xs font-bold text-slate-500">Offline candidate metadata summary · read-only</p>
        </div>
        <button type="button" onClick={onClear} className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-600 dark:border-slate-800 dark:text-slate-300">بستن</button>
      </div>
      <div className="mt-3 rounded-2xl bg-slate-950 px-3 py-2 text-xs font-black text-white dark:bg-slate-900 dark:text-slate-300">
        Read-only · Deployment readiness metadata · No deployment execution · No inference · No activation
      </div>

      {error ? <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">{error}</p> : null}
      {loading ? <p className="mt-3 text-xs font-bold text-slate-500">در حال دریافت…</p> : null}

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <article className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <small className="text-xs font-bold text-slate-500">Readiness score</small>
          <strong className="mt-1 block text-xl font-black text-slate-900 dark:text-white">{formatScore(summary?.deploymentReadinessScorePct || 0)}</strong>
          <em className="not-italic text-xs text-slate-500">{statusLabel(summary?.status)}</em>
        </article>
        <article className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <small className="text-xs font-bold text-slate-500">Completeness / Safety</small>
          <strong className="mt-1 block text-xl font-black text-slate-900 dark:text-white">{formatScore(summary?.completenessScorePct || 0)}</strong>
          <em className="not-italic text-xs text-slate-500">safety: {formatScore(summary?.safetyScorePct || 0)}</em>
        </article>
        <article className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <small className="text-xs font-bold text-slate-500">Coverage</small>
          <strong className="mt-1 block text-xl font-black text-slate-900 dark:text-white">{formatScore(summary?.metricsCoverageScorePct || 0)}</strong>
          <em className="not-italic text-xs text-slate-500">metrics / calibration / errors</em>
        </article>
        <article className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <small className="text-xs font-bold text-slate-500">Robustness / limitations</small>
          <strong className="mt-1 block text-xl font-black text-slate-900 dark:text-white">{formatScore(summary?.robustnessCoverageScorePct || 0)}</strong>
          <em className="not-italic text-xs text-slate-500">limitations: {nf.format(summary?.limitationCount || 0)}</em>
        </article>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <article className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900">
          <strong className="text-xs font-black text-slate-700 dark:text-slate-200">Readiness checks</strong>
          <ul className="mt-2 space-y-1 text-xs font-bold text-slate-500">
            {checks.map((check) => <li key={check.key}>{check.label}: {statusLabel(check.status)} · {check.source || '—'}</li>)}
          </ul>
        </article>
        <article className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900">
          <strong className="text-xs font-black text-slate-700 dark:text-slate-200">Readiness signals</strong>
          <ul className="mt-2 space-y-1 text-xs font-bold text-slate-500">
            {signals.map((item) => <li key={item.key}>{item.label}: {item.status} · {formatScore(item.score)} · {item.source || '—'}</li>)}
          </ul>
        </article>
      </div>

      <pre className="mt-4 max-h-72 overflow-auto rounded-2xl bg-slate-950 p-3 text-left text-[11px] font-bold text-slate-100" dir="ltr">{compactJson(payload?.deploymentReadinessMetadataPreview)}</pre>

      <p className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
        {summary?.recommendedNextAction || 'Deployment readiness metadata فقط برای review آفلاین است؛ backend execution، inference، activation و business mutation غیرفعال می‌ماند.'}
      </p>
    </section>
  );
}

export default React.memo(OfflineCandidateDeploymentReadinessMetadata);
