import React, { useEffect, useMemo, useState } from 'react';
import { DataTableShell } from '@/components/ui';
import { apiFetch } from '../../utils/apiFetch';

type QualityCheck = {
  key?: string;
  label?: string;
  status?: 'pass' | 'warning' | 'fail' | string;
  weight?: number;
  earned?: number;
  source?: string;
  message?: string;
};

type QualitySummary = {
  status?: string;
  candidatePackageId?: string | null;
  modelKey?: string | null;
  modelVersion?: string | null;
  predictionType?: string | null;
  horizonDays?: number | null;
  qualityScorePct?: number;
  passCount?: number;
  warningCount?: number;
  failCount?: number;
  requiredMetadataCount?: number;
  availableMetadataCount?: number;
  metadataReadOnlyModelCardQualityScoring?: true;
  backendModelExecutionAllowed?: false;
  backendInferenceEndpointExposed?: false;
  productionIntegrationAllowed?: false;
  decisionAutomationAllowed?: false;
  canChangeInventoryOrAccounting?: false;
  artifactActivationAllowed?: false;
  rawTrainingCsvLoadingAllowedInBackend?: false;
  recommendedNextAction?: string;
};

type QualityPayload = {
  summary?: QualitySummary;
  checks?: QualityCheck[];
  missingRequiredSections?: string[];
  warningSections?: string[];
  modelCardPreview?: Record<string, unknown>;
};

type Props = {
  metadataImportId: number | null;
  onClear?: () => void;
};

const nf = new Intl.NumberFormat('fa-IR');

const formatNumber = (value: unknown) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? nf.format(numeric) : '—';
};

const statusLabel = (value?: string | null) => {
  const text = String(value || '').trim();
  if (!text) return '—';
  if (text.includes('ready')) return 'کیفیت Model Card آماده';
  if (text.includes('warning')) return 'نیازمند تکمیل Model Card';
  if (text.includes('blocked')) return 'دارای نقص ایمنی';
  if (text.includes('not_found')) return 'Candidate یافت نشد';
  return text;
};

const checkStatusLabel = (value?: string | null) => {
  if (value === 'pass') return 'کامل';
  if (value === 'warning') return 'نیمه‌کامل';
  if (value === 'fail') return 'ناقص';
  return value || '—';
};

const previewValue = (value: unknown) => {
  if (Array.isArray(value)) return value.length ? value.join('، ') : '—';
  if (typeof value === 'string') return value || '—';
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value).slice(0, 160);
  return String(value);
};

function OfflineCandidateModelCardQualityScoring({ metadataImportId, onClear }: Props) {
  const [payload, setPayload] = useState<QualityPayload | null>(null);
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
        const res = await apiFetch(`/api/brain/ml-datasets/inventory-stockout/candidate-model-card-quality-scoring/${metadataImportId}`);
        const json = await res.json().catch(() => null);
        if (!res.ok || json?.success === false) throw new Error(json?.message || 'خطا در دریافت Model Card Quality Score');
        if (active) setPayload(json?.data || null);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'خطا در دریافت Model Card Quality Score');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [metadataImportId]);

  const summary = payload?.summary;
  const checks = useMemo(() => (payload?.checks || []).slice(0, 16), [payload?.checks]);
  const missing = useMemo(() => payload?.missingRequiredSections || [], [payload?.missingRequiredSections]);
  const preview = payload?.modelCardPreview || {};

  if (!metadataImportId) return null;

  return (
    <section className="mt-4 rounded-[28px] border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70" aria-label="Offline candidate model card quality scoring">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <span className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-500">Phase 9F · Model Card Quality</span>
          <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">امتیاز کیفیت Model Card آفلاین Candidate</h3>
          <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">این بخش فقط کامل بودن و ایمنی metadata در model_card.json و candidate manifest را امتیازدهی می‌کند؛ مدل اجرا، فعال یا وارد runtime نمی‌شود.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">Read-only · Metadata score · No activation</span>
          {onClear ? (
            <button type="button" onClick={onClear} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-600 transition hover:-translate-y-0.5 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">بستن امتیاز Model Card</button>
          ) : null}
        </div>
      </div>

      {error ? <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">{error}</p> : null}

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <article className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <small className="text-xs font-bold text-slate-500">Candidate</small>
          <strong className="mt-1 block truncate text-sm font-black text-slate-900 dark:text-white">{loading ? '…' : summary?.candidatePackageId || '—'}</strong>
          <em className="not-italic text-xs text-slate-500">{summary?.modelVersion || '—'}</em>
        </article>
        <article className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <small className="text-xs font-bold text-slate-500">Quality score</small>
          <strong className="mt-1 block text-xl font-black text-slate-900 dark:text-white">{loading ? '…' : `${formatNumber(summary?.qualityScorePct)}٪`}</strong>
          <em className="not-italic text-xs text-slate-500">available: {formatNumber(summary?.availableMetadataCount)} / {formatNumber(summary?.requiredMetadataCount)}</em>
        </article>
        <article className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <small className="text-xs font-bold text-slate-500">Checks</small>
          <strong className="mt-1 block text-xl font-black text-slate-900 dark:text-white">{loading ? '…' : formatNumber(summary?.passCount)}</strong>
          <em className="not-italic text-xs text-slate-500">warnings {formatNumber(summary?.warningCount)} · fail {formatNumber(summary?.failCount)}</em>
        </article>
        <article className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <small className="text-xs font-bold text-slate-500">Status</small>
          <strong className="mt-1 block text-sm font-black text-slate-900 dark:text-white">{loading ? '…' : statusLabel(summary?.status)}</strong>
          <em className="not-italic text-xs text-slate-500">metadata-only</em>
        </article>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <h4 className="text-sm font-black text-slate-900 dark:text-white">Model card preview</h4>
          <dl className="mt-3 grid gap-2 text-xs">
            {Object.entries(preview).map(([key, value]) => (
              <div key={key} className="rounded-2xl bg-white px-3 py-2 dark:bg-slate-950">
                <dt className="font-black text-slate-700 dark:text-white">{key}</dt>
                <dd className="mt-1 font-bold text-slate-500 dark:text-slate-400">{previewValue(value)}</dd>
              </div>
            ))}
          </dl>
        </article>

        <article className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <h4 className="text-sm font-black text-slate-900 dark:text-white">Missing required sections</h4>
          <div className="mt-3 flex flex-wrap gap-2">
            {missing.length ? missing.map((section) => (
              <span key={section} className="rounded-2xl bg-white px-3 py-2 text-xs font-black text-rose-600 dark:bg-slate-950 dark:text-rose-300">{section}</span>
            )) : <span className="rounded-2xl bg-white px-3 py-2 text-xs font-black text-emerald-600 dark:bg-slate-950 dark:text-emerald-300">همه بخش‌های اصلی Model Card کامل هستند.</span>}
          </div>
          <p className="mt-3 rounded-2xl bg-white px-3 py-2 text-xs font-bold text-slate-500 dark:bg-slate-950 dark:text-slate-400">این امتیازدهی فقط کیفیت metadata را نشان می‌دهد و هیچ production approval یا activation نیست.</p>
        </article>
      </div>

      <DataTableShell className="mt-4" aria-label="Model card quality checks" data-ui-ml-table="model-card-quality-checks">
        <table className="min-w-full divide-y divide-slate-100 text-right text-xs dark:divide-slate-800">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th className="px-3 py-2 font-black">Section</th>
              <th className="px-3 py-2 font-black">Status</th>
              <th className="px-3 py-2 font-black">Score</th>
              <th className="px-3 py-2 font-black">Source</th>
              <th className="px-3 py-2 font-black">Message</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-950">
            {checks.length ? checks.map((check) => (
              <tr key={check.key || check.label}>
                <td className="px-3 py-2 font-black text-slate-800 dark:text-white">{check.label || check.key || '—'}</td>
                <td className="px-3 py-2 font-bold text-slate-600 dark:text-slate-300">{checkStatusLabel(check.status)}</td>
                <td className="px-3 py-2 font-bold text-slate-600 dark:text-slate-300">{formatNumber(check.earned)} / {formatNumber(check.weight)}</td>
                <td className="px-3 py-2 font-bold text-slate-500">{check.source || '—'}</td>
                <td className="px-3 py-2 font-bold text-slate-600 dark:text-slate-300">{check.message || '—'}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center font-bold text-slate-500">برای این candidate هنوز metadata قابل امتیازدهی موجود نیست.</td>
              </tr>
            )}
          </tbody>
        </table>
      </DataTableShell>

      <p className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
        {summary?.recommendedNextAction || 'این صفحه فقط Model Card metadata را امتیازدهی می‌کند؛ production inference، activation و business mutation همچنان غیرفعال است.'}
      </p>
    </section>
  );
}

export default React.memo(OfflineCandidateModelCardQualityScoring);
