import React, { useEffect, useMemo, useState } from 'react';
import { DataTableShell } from '@/components/ui';
import { apiFetch } from '../../utils/apiFetch';

type Check = {
  key: string;
  label: string;
  status: 'pass' | 'warning' | 'fail';
  source?: string;
  message?: string;
  earned?: number;
  weight?: number;
};

type Signal = {
  key: string;
  family: string;
  label: string;
  status: 'available' | 'missing';
  source?: string;
  count?: number;
  message?: string;
};

type Summary = {
  status?: string;
  featureContractDriftScorePct?: number;
  passCount?: number;
  warningCount?: number;
  failCount?: number;
  featureContractDriftSignalCount?: number;
  availableSignalCount?: number;
  missingSignalCount?: number;
  baselineFeatureContractAvailable?: boolean;
  candidateFeatureContractAvailable?: boolean;
  targetContractDriftAvailable?: boolean;
  baselineFeatureCount?: number;
  candidateFeatureCount?: number;
  addedFeatureCount?: number;
  removedFeatureCount?: number;
  changedFeatureCount?: number;
  typeDriftCount?: number;
  nullableDriftCount?: number;
  warnings?: string[];
  recommendedNextAction?: string;
};

type Payload = {
  summary?: Summary;
  checks?: Check[];
  featureContractDriftSignals?: Signal[];
  featureContractDriftMetadataPreview?: Record<string, unknown>;
  baselineFeatureContractPreview?: Record<string, unknown>;
  candidateFeatureContractPreview?: Record<string, unknown>;
  addedFeatures?: string[];
  removedFeatures?: string[];
  changedFeatures?: string[];
  typeDriftPreview?: unknown;
  nullableDriftPreview?: unknown;
  targetContractDriftPreview?: Record<string, unknown>;
};

const nf = new Intl.NumberFormat('fa-IR');

const statusLabel = (value?: string) => {
  const text = String(value || '').trim();
  if (!text) return '—';
  if (text.includes('ready')) return 'آماده بررسی';
  if (text.includes('warning')) return 'نیازمند بررسی';
  if (text.includes('missing')) return 'متادیتا ناقص';
  if (text.includes('not_found')) return 'یافت نشد';
  return text;
};

const compactJson = (value: unknown) => {
  if (!value || (typeof value === 'object' && Object.keys(value as Record<string, unknown>).length === 0)) return '—';
  return JSON.stringify(value, null, 2).slice(0, 1400);
};

function OfflineCandidateFeatureContractDriftMetadata({ metadataImportId, onClear }: { metadataImportId: number | null; onClear: () => void }) {
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
        const res = await apiFetch(`/api/brain/ml-datasets/inventory-stockout/candidate-feature-contract-drift-metadata/${metadataImportId}`);
        const json = await res.json().catch(() => null);
        if (!res.ok || json?.success === false) throw new Error(json?.message || 'خطا در دریافت Feature Contract Drift Metadata');
        if (active) setPayload(json?.data || null);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'خطا در دریافت Feature Contract Drift Metadata');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [metadataImportId]);

  const summary = payload?.summary;
  const checks = useMemo(() => payload?.checks || [], [payload?.checks]);
  const signals = useMemo(() => payload?.featureContractDriftSignals || [], [payload?.featureContractDriftSignals]);

  if (!metadataImportId) return null;

  return (
    <section className="mt-4 rounded-[28px] border border-slate-200/80 bg-white/95 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/80" aria-label="Offline candidate feature contract drift metadata">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <span className="text-[11px] font-black uppercase tracking-[0.24em] text-indigo-500">Phase 9I · Metadata Only</span>
          <h4 className="mt-1 text-base font-black text-slate-950 dark:text-white">Feature Contract Drift Metadata</h4>
          <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">فقط added/removed/changed/type/nullable/target contract drift از متادیتای import شده خوانده می‌شود؛ raw dataset یا model اجرا نمی‌شود.</p>
        </div>
        <button type="button" onClick={onClear} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">بستن</button>
      </div>

      <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        Read-only · Feature contract metadata · No raw data loading · No execution · No activation
      </div>

      {error ? <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">{error}</p> : null}
      {loading ? <p className="mt-3 text-xs font-bold text-slate-500">در حال دریافت…</p> : null}

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <article className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <small className="text-xs font-bold text-slate-500">Feature drift score</small>
          <strong className="mt-1 block text-xl font-black text-slate-900 dark:text-white">{nf.format(summary?.featureContractDriftScorePct || 0)}٪</strong>
          <em className="not-italic text-xs text-slate-500">{statusLabel(summary?.status)}</em>
        </article>
        <article className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <small className="text-xs font-bold text-slate-500">Feature count</small>
          <strong className="mt-1 block text-xl font-black text-slate-900 dark:text-white">{nf.format(summary?.candidateFeatureCount || 0)}</strong>
          <em className="not-italic text-xs text-slate-500">baseline: {nf.format(summary?.baselineFeatureCount || 0)}</em>
        </article>
        <article className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <small className="text-xs font-bold text-slate-500">Added / Removed</small>
          <strong className="mt-1 block text-xl font-black text-slate-900 dark:text-white">{nf.format(summary?.addedFeatureCount || 0)} / {nf.format(summary?.removedFeatureCount || 0)}</strong>
          <em className="not-italic text-xs text-slate-500">changed: {nf.format(summary?.changedFeatureCount || 0)}</em>
        </article>
        <article className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <small className="text-xs font-bold text-slate-500">Type / Nullable drift</small>
          <strong className="mt-1 block text-xl font-black text-slate-900 dark:text-white">{nf.format(summary?.typeDriftCount || 0)} / {nf.format(summary?.nullableDriftCount || 0)}</strong>
          <em className="not-italic text-xs text-slate-500">target: {summary?.targetContractDriftAvailable ? 'available' : 'missing'}</em>
        </article>
      </div>

      <DataTableShell className="mt-4" aria-label="Feature contract drift signals" data-ui-ml-table="feature-contract-drift">
        <table className="min-w-full divide-y divide-slate-100 text-right text-xs dark:divide-slate-800">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <tr><th className="px-3 py-2 font-black">Check</th><th className="px-3 py-2 font-black">Status</th><th className="px-3 py-2 font-black">Source</th><th className="px-3 py-2 font-black">Message</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-950">
            {checks.map((check) => (
              <tr key={check.key}>
                <td className="px-3 py-2 font-black text-slate-800 dark:text-slate-100">{check.label}</td>
                <td className="px-3 py-2 font-bold text-slate-600 dark:text-slate-300">{statusLabel(check.status)}</td>
                <td className="px-3 py-2 font-bold text-slate-500">{check.source || '—'}</td>
                <td className="px-3 py-2 font-bold text-slate-500">{check.message || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DataTableShell>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <article className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900">
          <strong className="text-xs font-black text-slate-700 dark:text-slate-200">Feature contract drift signals</strong>
          <ul className="mt-2 space-y-1 text-xs font-bold text-slate-500">
            {signals.map((signal) => <li key={signal.key}>{signal.label}: {signal.status} · {nf.format(signal.count || 0)} · {signal.source || '—'}</li>)}
          </ul>
        </article>
        <article className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900">
          <strong className="text-xs font-black text-slate-700 dark:text-slate-200">Added / Removed / Changed</strong>
          <p className="mt-2 text-xs font-bold text-slate-500">Added: {(payload?.addedFeatures || []).slice(0, 12).join('، ') || '—'}</p>
          <p className="mt-1 text-xs font-bold text-slate-500">Removed: {(payload?.removedFeatures || []).slice(0, 12).join('، ') || '—'}</p>
          <p className="mt-1 text-xs font-bold text-slate-500">Changed: {(payload?.changedFeatures || []).slice(0, 12).join('، ') || '—'}</p>
        </article>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <pre className="max-h-72 overflow-auto rounded-2xl bg-slate-950 p-3 text-left text-[11px] font-bold text-slate-100">{compactJson(payload?.baselineFeatureContractPreview)}</pre>
        <pre className="max-h-72 overflow-auto rounded-2xl bg-slate-950 p-3 text-left text-[11px] font-bold text-slate-100">{compactJson(payload?.candidateFeatureContractPreview)}</pre>
        <pre className="max-h-72 overflow-auto rounded-2xl bg-slate-950 p-3 text-left text-[11px] font-bold text-slate-100">{compactJson(payload?.typeDriftPreview)}</pre>
        <pre className="max-h-72 overflow-auto rounded-2xl bg-slate-950 p-3 text-left text-[11px] font-bold text-slate-100">{compactJson(payload?.nullableDriftPreview)}</pre>
      </div>

      <p className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
        {summary?.recommendedNextAction || 'این پنل فقط متادیتای Feature Contract Drift را نشان می‌دهد و هیچ execution، activation یا business mutation انجام نمی‌دهد.'}
      </p>
    </section>
  );
}

export default React.memo(OfflineCandidateFeatureContractDriftMetadata);
