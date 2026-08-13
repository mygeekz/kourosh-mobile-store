import React, { useEffect, useMemo, useState } from 'react';
import { DataTableShell } from '@/components/ui';
import { apiFetch } from '../../utils/apiFetch';

import { formatExactNumberText, formatExactPercentText } from '../../utils/exactNumber';
type Check = { key: string; label: string; status: string; source: string; message?: string; value?: unknown };
type Signal = { key: string; label: string; family: string; status: string; source: string; count: number; message?: string };
type ErrorItem = {
  key: string;
  family: string;
  label: string;
  count?: number | null;
  rate?: number | null;
  confidence?: number | null;
  severity?: string;
  source?: string;
  examples?: string[];
  notes?: string[];
};
type Summary = {
  status?: string;
  errorAnalysisScorePct?: number;
  errorItemCount?: number;
  falsePositiveMetadataCount?: number;
  falseNegativeMetadataCount?: number;
  highConfidenceWrongCount?: number;
  errorBucketCount?: number;
  errorNoteCount?: number;
  warnings?: string[];
  recommendedNextAction?: string;
};

type Payload = {
  summary?: Summary;
  checks?: Check[];
  errorAnalysisSignals?: Signal[];
  errorAnalysisItems?: ErrorItem[];
  errorAnalysisMetadataPreview?: Record<string, unknown>;
};

const nf = { format: (value: unknown) => formatExactNumberText(value) };
const pct = { format: (value: unknown) => formatExactPercentText(Number(value || 0) * 100) };

const statusLabel = (value?: string) => {
  const text = String(value || '').trim();
  if (!text) return '—';
  if (text.includes('ready')) return 'آماده بررسی';
  if (text.includes('warning')) return 'نیازمند بررسی';
  if (text.includes('missing')) return 'متادیتا ناقص';
  if (text.includes('not_found')) return 'یافت نشد';
  if (text === 'pass') return 'ایمن';
  return text;
};

const formatMetric = (value: unknown) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  if (numeric >= 0 && numeric <= 1) return pct.format(numeric);
  return formatExactNumberText(numeric);
};

const compactJson = (value: unknown) => {
  if (!value || (typeof value === 'object' && Object.keys(value as Record<string, unknown>).length === 0)) return '—';
  return JSON.stringify(value, null, 2).slice(0, 1400);
};

function OfflineCandidateErrorAnalysisMetadata({ metadataImportId, onClear }: { metadataImportId: number | null; onClear: () => void }) {
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
        const res = await apiFetch(`/api/brain/ml-datasets/inventory-stockout/candidate-error-analysis-metadata/${metadataImportId}`);
        const json = await res.json().catch(() => null);
        if (!res.ok || json?.success === false) throw new Error(json?.message || 'خطا در دریافت Error Analysis Metadata');
        if (active) setPayload(json?.data || null);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'خطا در دریافت Error Analysis Metadata');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [metadataImportId]);

  const summary = payload?.summary;
  const checks = useMemo(() => payload?.checks || [], [payload?.checks]);
  const items = useMemo(() => payload?.errorAnalysisItems || [], [payload?.errorAnalysisItems]);
  const signals = useMemo(() => payload?.errorAnalysisSignals || [], [payload?.errorAnalysisSignals]);

  if (!metadataImportId) return null;

  return (
    <section className="mt-4 rounded-[28px] border border-slate-200/80 bg-white/95 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/80" aria-label="Offline candidate error analysis metadata">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <span className="text-[11px] font-black uppercase tracking-[0.24em] text-indigo-500">Phase 9L · Metadata Only</span>
          <h4 className="mt-1 text-base font-black text-slate-950 dark:text-white">Error Analysis Metadata Snapshot</h4>
          <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">فقط error analysis metadata آفلاین، false positive، false negative، error bucket و high-confidence wrong خوانده می‌شود؛ تحلیل خطا در backend اجرا، فعال یا تصمیم‌ساز نمی‌شود.</p>
        </div>
        <button type="button" onClick={onClear} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">بستن</button>
      </div>

      <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        Read-only · Error analysis metadata · No error analysis execution · No inference · No activation
      </div>

      {error ? <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">{error}</p> : null}
      {loading ? <p className="mt-3 text-xs font-bold text-slate-500">در حال دریافت…</p> : null}

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <article className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <small className="text-xs font-bold text-slate-500">Error analysis score</small>
          <strong className="mt-1 block text-xl font-black text-slate-900 dark:text-white">{nf.format(summary?.errorAnalysisScorePct || 0)}٪</strong>
          <em className="not-italic text-xs text-slate-500">{statusLabel(summary?.status)}</em>
        </article>
        <article className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <small className="text-xs font-bold text-slate-500">False positives</small>
          <strong className="mt-1 block text-xl font-black text-slate-900 dark:text-white">{nf.format(summary?.falsePositiveMetadataCount || 0)}</strong>
          <em className="not-italic text-xs text-slate-500">false alarms metadata</em>
        </article>
        <article className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <small className="text-xs font-bold text-slate-500">False negatives</small>
          <strong className="mt-1 block text-xl font-black text-slate-900 dark:text-white">{nf.format(summary?.falseNegativeMetadataCount || 0)}</strong>
          <em className="not-italic text-xs text-slate-500">missed stockouts metadata</em>
        </article>
        <article className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <small className="text-xs font-bold text-slate-500">High-confidence wrong</small>
          <strong className="mt-1 block text-xl font-black text-slate-900 dark:text-white">{nf.format(summary?.highConfidenceWrongCount || 0)}</strong>
          <em className="not-italic text-xs text-slate-500">buckets: {nf.format(summary?.errorBucketCount || 0)}</em>
        </article>
      </div>

      <DataTableShell className="mt-4" aria-label="Error analysis metadata items" data-ui-ml-table="error-analysis-items">
        <table className="min-w-full divide-y divide-slate-100 text-right text-xs dark:divide-slate-800">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <tr><th className="px-3 py-2 font-black">Family</th><th className="px-3 py-2 font-black">Label</th><th className="px-3 py-2 font-black">Count</th><th className="px-3 py-2 font-black">Rate</th><th className="px-3 py-2 font-black">Confidence</th><th className="px-3 py-2 font-black">Severity</th><th className="px-3 py-2 font-black">Source</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-950">
            {items.length ? items.map((item) => (
              <tr key={`${item.family}-${item.key}`}>
                <td className="px-3 py-2 font-black text-slate-800 dark:text-slate-100">{item.family || '—'}</td>
                <td className="px-3 py-2 font-bold text-slate-600 dark:text-slate-300">{item.label || item.key}</td>
                <td className="px-3 py-2 font-bold text-slate-500">{item.count == null ? '—' : nf.format(item.count)}</td>
                <td className="px-3 py-2 font-bold text-slate-500">{formatMetric(item.rate)}</td>
                <td className="px-3 py-2 font-bold text-slate-500">{formatMetric(item.confidence)}</td>
                <td className="px-3 py-2 font-bold text-slate-500">{item.severity || '—'}</td>
                <td className="px-3 py-2 font-bold text-slate-500">{item.source || '—'}</td>
              </tr>
            )) : (
              <tr><td colSpan={7} className="px-3 py-3 text-center font-bold text-slate-500">Error analysis metadata هنوز در candidate package وجود ندارد.</td></tr>
            )}
          </tbody>
        </table>
      </DataTableShell>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <article className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900">
          <strong className="text-xs font-black text-slate-700 dark:text-slate-200">Error analysis checks</strong>
          <ul className="mt-2 space-y-1 text-xs font-bold text-slate-500">
            {checks.map((check) => <li key={check.key}>{check.label}: {statusLabel(check.status)} · {check.source || '—'}</li>)}
          </ul>
        </article>
        <article className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900">
          <strong className="text-xs font-black text-slate-700 dark:text-slate-200">Error analysis signals</strong>
          <ul className="mt-2 space-y-1 text-xs font-bold text-slate-500">
            {signals.map((signal) => <li key={signal.key}>{signal.label}: {signal.status} · {nf.format(signal.count || 0)} · {signal.source || '—'}</li>)}
          </ul>
        </article>
      </div>

      <pre className="mt-4 max-h-72 overflow-auto rounded-2xl bg-slate-950 p-3 text-left text-[11px] font-bold text-slate-100" dir="ltr">{compactJson(payload?.errorAnalysisMetadataPreview)}</pre>

      <p className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
        {summary?.recommendedNextAction || 'Error analysis metadata فقط برای review آفلاین است؛ backend execution، inference، activation و business mutation غیرفعال می‌ماند.'}
      </p>
    </section>
  );
}

export default React.memo(OfflineCandidateErrorAnalysisMetadata);
