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
  value?: unknown;
  message?: string;
};

type TrainingPackageQualitySummary = {
  status?: string;
  candidatePackageId?: string | null;
  modelKey?: string | null;
  modelVersion?: string | null;
  predictionType?: string | null;
  targetColumn?: string | null;
  horizonDays?: number | null;
  validationStatus?: string | null;
  trainingManifestHash?: string | null;
  qualityScorePct?: number;
  passCount?: number;
  warningCount?: number;
  failCount?: number;
  rowCountTrain?: number | null;
  rowCountTest?: number | null;
  totalRows?: number | null;
  featureCount?: number | null;
  missingColumnCount?: number;
  warningMessageCount?: number;
  errorMessageCount?: number;
  splitInfoAvailable?: boolean;
  featureContractAvailable?: boolean;
  targetDefinitionAvailable?: boolean;
  metadataReadOnlyTrainingPackageQualitySnapshot?: true;
  backendModelExecutionAllowed?: false;
  backendInferenceEndpointExposed?: false;
  productionIntegrationAllowed?: false;
  decisionAutomationAllowed?: false;
  canChangeInventoryOrAccounting?: false;
  artifactActivationAllowed?: false;
  rawTrainingCsvLoadingAllowedInBackend?: false;
  recommendedNextAction?: string;
};

type TrainingPackageQualityPayload = {
  summary?: TrainingPackageQualitySummary;
  checks?: QualityCheck[];
  validationReportPreview?: Record<string, unknown>;
  rowCountSnapshot?: Record<string, unknown>;
  featureContractSnapshot?: Record<string, unknown>;
  targetSnapshot?: Record<string, unknown>;
  splitSnapshot?: Record<string, unknown>;
  warnings?: string[];
  errors?: string[];
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
  if (text.includes('ready')) return 'کیفیت دیتاست آماده';
  if (text.includes('warning')) return 'دارای هشدار کیفیت دیتاست';
  if (text.includes('blocked')) return 'مسدود به‌خاطر خطای اعتبارسنجی';
  if (text.includes('not_found')) return 'Candidate یافت نشد';
  return text;
};

const checkStatusLabel = (value?: string | null) => {
  if (value === 'pass') return 'کامل';
  if (value === 'warning') return 'نیازمند بررسی';
  if (value === 'fail') return 'ناقص';
  return value || '—';
};

const previewValue = (value: unknown) => {
  if (Array.isArray(value)) return value.length ? value.map((item) => String(item)).join('، ') : '—';
  if (typeof value === 'string') return value || '—';
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value).slice(0, 180);
  return String(value);
};

function OfflineCandidateTrainingPackageQualitySnapshot({ metadataImportId, onClear }: Props) {
  const [payload, setPayload] = useState<TrainingPackageQualityPayload | null>(null);
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
        const res = await apiFetch(`/api/brain/ml-datasets/inventory-stockout/candidate-training-package-quality-snapshot/${metadataImportId}`);
        const json = await res.json().catch(() => null);
        if (!res.ok || json?.success === false) throw new Error(json?.message || 'خطا در دریافت Training Package Quality Snapshot');
        if (active) setPayload(json?.data || null);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'خطا در دریافت Training Package Quality Snapshot');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [metadataImportId]);

  const summary = payload?.summary;
  const checks = useMemo(() => (payload?.checks || []).slice(0, 16), [payload?.checks]);
  const warnings = useMemo(() => payload?.warnings || [], [payload?.warnings]);
  const errors = useMemo(() => payload?.errors || [], [payload?.errors]);
  const previewEntries = useMemo(() => [
    ['validationReportPreview', payload?.validationReportPreview],
    ['rowCountSnapshot', payload?.rowCountSnapshot],
    ['featureContractSnapshot', payload?.featureContractSnapshot],
    ['targetSnapshot', payload?.targetSnapshot],
    ['splitSnapshot', payload?.splitSnapshot],
  ] as Array<[string, Record<string, unknown> | undefined]>, [payload]);

  if (!metadataImportId) return null;

  return (
    <section className="mt-4 rounded-[28px] border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70" aria-label="Offline candidate training package quality snapshot">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <span className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-500">Phase 9G · Training Package Quality</span>
          <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">نمای کیفیت Training Package آفلاین Candidate</h3>
          <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">این بخش فقط metadata گزارش اعتبارسنجی training package را خلاصه می‌کند؛ فایل خام، مدل، artifact یا runtime ML در backend خوانده یا اجرا نمی‌شود.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">Read-only · Dataset metadata · No raw file loading</span>
          {onClear ? (
            <button type="button" onClick={onClear} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-600 transition hover:-translate-y-0.5 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">بستن کیفیت دیتاست</button>
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
          <em className="not-italic text-xs text-slate-500">pass {formatNumber(summary?.passCount)} · warn {formatNumber(summary?.warningCount)} · fail {formatNumber(summary?.failCount)}</em>
        </article>
        <article className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <small className="text-xs font-bold text-slate-500">Rows / Features</small>
          <strong className="mt-1 block text-xl font-black text-slate-900 dark:text-white">{loading ? '…' : formatNumber(summary?.totalRows)}</strong>
          <em className="not-italic text-xs text-slate-500">features: {formatNumber(summary?.featureCount)}</em>
        </article>
        <article className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <small className="text-xs font-bold text-slate-500">Status</small>
          <strong className="mt-1 block text-sm font-black text-slate-900 dark:text-white">{loading ? '…' : statusLabel(summary?.status)}</strong>
          <em className="not-italic text-xs text-slate-500">metadata-only</em>
        </article>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <h4 className="text-sm font-black text-slate-900 dark:text-white">Training package snapshot</h4>
          <dl className="mt-3 grid gap-2 text-xs">
            <div className="rounded-2xl bg-white px-3 py-2 dark:bg-slate-950">
              <dt className="font-black text-slate-700 dark:text-white">Row counts</dt>
              <dd className="mt-1 font-bold text-slate-500 dark:text-slate-400">train {formatNumber(summary?.rowCountTrain)} · test {formatNumber(summary?.rowCountTest)} · total {formatNumber(summary?.totalRows)}</dd>
            </div>
            <div className="rounded-2xl bg-white px-3 py-2 dark:bg-slate-950">
              <dt className="font-black text-slate-700 dark:text-white">Feature / Target</dt>
              <dd className="mt-1 font-bold text-slate-500 dark:text-slate-400">features {formatNumber(summary?.featureCount)} · target {summary?.targetColumn || '—'}</dd>
            </div>
            <div className="rounded-2xl bg-white px-3 py-2 dark:bg-slate-950">
              <dt className="font-black text-slate-700 dark:text-white">Validation</dt>
              <dd className="mt-1 font-bold text-slate-500 dark:text-slate-400">{summary?.validationStatus || '—'} · missing columns {formatNumber(summary?.missingColumnCount)}</dd>
            </div>
          </dl>
        </article>

        <article className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <h4 className="text-sm font-black text-slate-900 dark:text-white">Warnings / Errors</h4>
          <div className="mt-3 flex flex-wrap gap-2">
            {errors.length ? errors.slice(0, 8).map((item) => (
              <span key={`error-${item}`} className="rounded-2xl bg-white px-3 py-2 text-xs font-black text-rose-600 dark:bg-slate-950 dark:text-rose-300">{item}</span>
            )) : null}
            {warnings.length ? warnings.slice(0, 8).map((item) => (
              <span key={`warning-${item}`} className="rounded-2xl bg-white px-3 py-2 text-xs font-black text-amber-600 dark:bg-slate-950 dark:text-amber-300">{item}</span>
            )) : null}
            {!errors.length && !warnings.length ? <span className="rounded-2xl bg-white px-3 py-2 text-xs font-black text-emerald-600 dark:bg-slate-950 dark:text-emerald-300">در metadata واردشده warning/error اصلی ثبت نشده است.</span> : null}
          </div>
          <p className="mt-3 rounded-2xl bg-white px-3 py-2 text-xs font-bold text-slate-500 dark:bg-slate-950 dark:text-slate-400">این Snapshot فقط کیفیت training package metadata را نشان می‌دهد و production approval یا model activation نیست.</p>
        </article>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {previewEntries.map(([label, value]) => (
          <article key={label} className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
            <h4 className="text-sm font-black text-slate-900 dark:text-white">{label}</h4>
            <dl className="mt-3 grid gap-2 text-xs">
              {Object.entries(value || {}).slice(0, 8).map(([key, entry]) => (
                <div key={key} className="rounded-2xl bg-white px-3 py-2 dark:bg-slate-950">
                  <dt className="font-black text-slate-700 dark:text-white">{key}</dt>
                  <dd className="mt-1 font-bold text-slate-500 dark:text-slate-400">{previewValue(entry)}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>

      <DataTableShell className="mt-4" aria-label="Training package quality checks" data-ui-ml-table="training-package-quality-checks">
        <table className="min-w-full divide-y divide-slate-100 text-right text-xs dark:divide-slate-800">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th className="px-3 py-2 font-black">Check</th>
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
                <td colSpan={5} className="px-3 py-4 text-center font-bold text-slate-500">برای این candidate هنوز training package validation metadata قابل نمایش نیست.</td>
              </tr>
            )}
          </tbody>
        </table>
      </DataTableShell>

      <p className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
        {summary?.recommendedNextAction || 'این صفحه فقط training package metadata را خلاصه می‌کند؛ production inference، activation و business mutation همچنان غیرفعال است.'}
      </p>
    </section>
  );
}

export default React.memo(OfflineCandidateTrainingPackageQualitySnapshot);
