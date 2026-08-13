import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../utils/apiFetch';

import { formatExactNumberText, formatExactPercentText } from '../../utils/exactNumber';
type DrilldownMetric = {
  key: string;
  value?: number | string | null;
  available?: boolean;
  direction?: string;
  note?: string;
};

type DrilldownWarning = {
  source?: string;
  message?: string;
};

type DrilldownFeature = {
  name?: string;
  type?: string | null;
  role?: string;
  required?: boolean | null;
};

type DrilldownSummary = {
  status?: string;
  candidatePackageId?: string | null;
  modelKey?: string | null;
  modelVersion?: string | null;
  predictionType?: string | null;
  targetColumn?: string | null;
  horizonDays?: number | null;
  warningCount?: number;
  limitationCount?: number;
  featureCount?: number;
  checksumCount?: number;
  metadataReadOnlyDrilldown?: true;
  backendModelExecutionAllowed?: false;
  backendInferenceEndpointExposed?: false;
  productionIntegrationAllowed?: false;
  decisionAutomationAllowed?: false;
  canChangeInventoryOrAccounting?: false;
  artifactActivationAllowed?: false;
  recommendedNextAction?: string;
};

type DrilldownPayload = {
  summary?: DrilldownSummary;
  metrics?: DrilldownMetric[];
  warnings?: DrilldownWarning[];
  knownLimitations?: string[];
  featureContract?: DrilldownFeature[];
  checksumCoverage?: string[];
  outputSamplePreview?: Array<Record<string, unknown>>;
  explainabilityNotes?: string[];
};

type Props = {
  metadataImportId: number | null;
  onClear?: () => void;
};

const nf = { format: (value: unknown) => formatExactNumberText(value) };
const pct = { format: (value: unknown) => formatExactPercentText(Number(value || 0) * 100) };

const formatMetric = (value: unknown) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  if (numeric >= 0 && numeric <= 1) return pct.format(numeric);
  return formatExactNumberText(numeric);
};

const metricLabel = (key?: string) => {
  const labels: Record<string, string> = {
    accuracy: 'Accuracy',
    precisionScore: 'Precision',
    recallScore: 'Recall',
    f1: 'F1',
    rocAuc: 'ROC-AUC',
    mae: 'MAE',
    rmse: 'RMSE',
    r2: 'R²',
  };
  return labels[String(key || '')] || key || 'Metric';
};

const statusLabel = (value?: string | null) => {
  const text = String(value || '').trim();
  if (!text) return '—';
  if (text.includes('ready')) return 'آماده بررسی';
  if (text.includes('warning')) return 'دارای هشدار';
  if (text.includes('not_found')) return 'یافت نشد';
  return text;
};

function OfflineCandidateMetricDrilldown({ metadataImportId, onClear }: Props) {
  const [payload, setPayload] = useState<DrilldownPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!metadataImportId) {
        setPayload(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch(`/api/brain/ml-datasets/inventory-stockout/candidate-metric-drilldown/${metadataImportId}`);
        const json = await res.json().catch(() => null);
        if (!res.ok || json?.success === false) throw new Error(json?.message || 'خطا در دریافت جزئیات Candidate');
        if (active) setPayload(json?.data || null);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'خطا در دریافت جزئیات Candidate');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [metadataImportId]);

  const summary = payload?.summary;
  const metrics = useMemo(() => (payload?.metrics || []).filter((metric) => metric.available), [payload?.metrics]);
  const warnings = useMemo(() => (payload?.warnings || []).slice(0, 6), [payload?.warnings]);
  const limitations = useMemo(() => (payload?.knownLimitations || []).slice(0, 6), [payload?.knownLimitations]);
  const features = useMemo(() => (payload?.featureContract || []).slice(0, 10), [payload?.featureContract]);
  const checksums = useMemo(() => (payload?.checksumCoverage || []).slice(0, 10), [payload?.checksumCoverage]);
  const notes = useMemo(() => (payload?.explainabilityNotes || []).slice(0, 6), [payload?.explainabilityNotes]);

  if (!metadataImportId) return null;

  return (
    <section className="mt-4 rounded-[28px] border border-slate-200/80 bg-slate-50/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70" aria-label="Offline candidate metric drilldown">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <span className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-500">Phase 9D · Metric Drilldown</span>
          <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">جزئیات متریک و Explainability Candidate</h3>
          <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">این بخش فقط metadata import شده را نمایش می‌دهد؛ هیچ مدل، artifact یا inference در backend اجرا نمی‌شود.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">Execution Off · Activation Off</span>
          {onClear ? (
            <button type="button" onClick={onClear} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition hover:-translate-y-0.5 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">بستن جزئیات</button>
          ) : null}
        </div>
      </div>

      {error ? <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">{error}</p> : null}

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
          <small className="text-xs font-bold text-slate-500">Candidate</small>
          <strong className="mt-1 block truncate text-sm font-black text-slate-900 dark:text-white">{loading ? '…' : summary?.candidatePackageId || '—'}</strong>
          <em className="not-italic text-xs text-slate-500">{summary?.modelVersion || '—'}</em>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
          <small className="text-xs font-bold text-slate-500">Status</small>
          <strong className="mt-1 block text-sm font-black text-slate-900 dark:text-white">{loading ? '…' : statusLabel(summary?.status)}</strong>
          <em className="not-italic text-xs text-slate-500">warning: {nf.format(summary?.warningCount || 0)}</em>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
          <small className="text-xs font-bold text-slate-500">Feature contract</small>
          <strong className="mt-1 block text-sm font-black text-slate-900 dark:text-white">{loading ? '…' : nf.format(summary?.featureCount || 0)}</strong>
          <em className="not-italic text-xs text-slate-500">checksums: {nf.format(summary?.checksumCount || 0)}</em>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
          <small className="text-xs font-bold text-slate-500">Safety</small>
          <strong className="mt-1 block text-sm font-black text-slate-900 dark:text-white">Read-only</strong>
          <em className="not-italic text-xs text-slate-500">no execution / no mutation</em>
        </article>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
          <h4 className="text-sm font-black text-slate-900 dark:text-white">Metric drilldown</h4>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {metrics.length ? metrics.map((metric) => (
              <div key={metric.key} className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-900">
                <span className="text-xs font-black text-slate-500">{metricLabel(metric.key)}</span>
                <strong className="mt-1 block text-base font-black text-slate-950 dark:text-white">{formatMetric(metric.value)}</strong>
                <small className="text-[11px] font-bold text-slate-500">{metric.direction === 'lower_is_better' ? 'کمتر بهتر است' : 'بیشتر بهتر است'}</small>
              </div>
            )) : <p className="text-xs font-bold text-slate-500">متریک قابل نمایش وجود ندارد.</p>}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
          <h4 className="text-sm font-black text-slate-900 dark:text-white">Explainability notes</h4>
          <ul className="mt-3 space-y-2">
            {notes.length ? notes.map((note, index) => (
              <li key={`${note}-${index}`} className="rounded-2xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-300">{note}</li>
            )) : <li className="text-xs font-bold text-slate-500">Explainability metadata ثبت نشده است.</li>}
          </ul>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
          <h4 className="text-sm font-black text-slate-900 dark:text-white">Warnings & limitations</h4>
          <div className="mt-3 space-y-2">
            {warnings.map((warning, index) => (
              <p key={`${warning.source}-${index}`} className="rounded-2xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 dark:bg-amber-950/30 dark:text-amber-200">{warning.source || 'warning'}: {warning.message || '—'}</p>
            ))}
            {limitations.map((limitation, index) => (
              <p key={`${limitation}-${index}`} className="rounded-2xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-300">{limitation}</p>
            ))}
            {!warnings.length && !limitations.length ? <p className="text-xs font-bold text-slate-500">هشدار یا limitation ثبت نشده است.</p> : null}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
          <h4 className="text-sm font-black text-slate-900 dark:text-white">Feature contract & checksum coverage</h4>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="space-y-2">
              {features.length ? features.map((feature) => (
                <p key={`${feature.name}-${feature.type}`} className="rounded-2xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-300">{feature.name || 'feature'} · {feature.type || 'unknown'} · {feature.required === true ? 'required' : 'optional/unknown'}</p>
              )) : <p className="text-xs font-bold text-slate-500">Feature metadata وجود ندارد.</p>}
            </div>
            <div className="space-y-2">
              {checksums.length ? checksums.map((checksum) => (
                <p key={checksum} className="rounded-2xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-300">{checksum}</p>
              )) : <p className="text-xs font-bold text-slate-500">Checksum metadata وجود ندارد.</p>}
            </div>
          </div>
        </article>
      </div>

      <p className="mt-3 rounded-2xl bg-white px-3 py-2 text-xs font-bold text-slate-600 dark:bg-slate-950 dark:text-slate-300">
        {summary?.recommendedNextAction || 'این صفحه فقط جزئیات metadata را نشان می‌دهد؛ production inference، activation و business mutation همچنان غیرفعال است.'}
      </p>
    </section>
  );
}

export default React.memo(OfflineCandidateMetricDrilldown);
