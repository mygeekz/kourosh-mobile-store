import React, { useEffect, useMemo, useState } from 'react';
import { Table, DataTableShell } from '@/components/ui';
import { apiFetch } from '../../utils/apiFetch';

import { formatExactNumberText, formatExactPercentText } from '../../utils/exactNumber';
type DriftCheck = {
  key?: string;
  label?: string;
  status?: 'pass' | 'warning' | 'fail' | string;
  weight?: number;
  earned?: number;
  source?: string;
  value?: unknown;
  message?: string;
};

type DriftSignal = {
  key?: string;
  family?: string;
  label?: string;
  status?: string;
  source?: string;
  baselineValue?: unknown;
  candidateValue?: unknown;
  delta?: number | null;
  deltaPct?: number | null;
  message?: string;
};

type DriftSummary = {
  status?: string;
  candidatePackageId?: string | null;
  modelKey?: string | null;
  modelVersion?: string | null;
  predictionType?: string | null;
  targetColumn?: string | null;
  horizonDays?: number | null;
  trainingManifestHash?: string | null;
  driftScorePct?: number;
  passCount?: number;
  warningCount?: number;
  failCount?: number;
  driftSignalCount?: number;
  availableSignalCount?: number;
  missingSignalCount?: number;
  featureDistributionCount?: number;
  missingnessDriftCount?: number;
  targetBalanceSignalCount?: number;
  rowCountSignalCount?: number;
  baselineReferenceAvailable?: boolean;
  currentReferenceAvailable?: boolean;
  rowCountBaseline?: number | null;
  rowCountCandidate?: number | null;
  rowCountDeltaPct?: number | null;
  targetPositiveRateBaseline?: number | null;
  targetPositiveRateCandidate?: number | null;
  targetPositiveRateDelta?: number | null;
  metadataReadOnlyDataDriftBaseline?: true;
  backendModelExecutionAllowed?: false;
  backendInferenceEndpointExposed?: false;
  productionIntegrationAllowed?: false;
  decisionAutomationAllowed?: false;
  canChangeInventoryOrAccounting?: false;
  artifactActivationAllowed?: false;
  rawTrainingCsvLoadingAllowedInBackend?: false;
  baselineTrainingDataLoadingAllowedInBackend?: false;
  recommendedNextAction?: string;
};

type DriftPayload = {
  summary?: DriftSummary;
  checks?: DriftCheck[];
  driftSignals?: DriftSignal[];
  baselineMetadataPreview?: Record<string, unknown>;
  currentMetadataPreview?: Record<string, unknown>;
  featureDistributionPreview?: Record<string, unknown>;
  missingnessPreview?: Record<string, unknown>;
  targetBalancePreview?: Record<string, unknown>;
  sourceMetadata?: Record<string, unknown>;
};

type Props = {
  metadataImportId: number | null;
  onClear?: () => void;
};

const nf = { format: (value: unknown) => formatExactNumberText(value) };
const pct = { format: (value: unknown) => formatExactPercentText(Number(value || 0) * 100) };

const formatNumber = (value: unknown) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? nf.format(numeric) : '—';
};

const formatPercent = (value: unknown) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? pct.format(numeric) : '—';
};

const statusLabel = (value?: string | null) => {
  const text = String(value || '').trim();
  if (!text) return '—';
  if (text.includes('ready')) return 'پایداری داده آماده بررسی است';
  if (text.includes('warning')) return 'پایداری داده نیازمند بررسی است';
  if (text.includes('missing')) return 'اطلاعات پایداری داده موجود نیست';
  if (text.includes('not_found')) return 'مدل انتخاب‌شده یافت نشد';
  return text;
};

const checkStatusLabel = (value?: string | null) => {
  if (value === 'pass') return 'کامل';
  if (value === 'warning') return 'نیازمند تکمیل';
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

function OfflineCandidateDataDriftBaselineMetadata({ metadataImportId, onClear }: Props) {
  const [payload, setPayload] = useState<DriftPayload | null>(null);
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
        const res = await apiFetch(`/api/brain/ml-datasets/inventory-stockout/candidate-data-drift-baseline-metadata/${metadataImportId}`);
        const json = await res.json().catch(() => null);
        if (!res.ok || json?.success === false) throw new Error(json?.message || 'خطا در دریافت اطلاعات پایداری داده');
        if (active) setPayload(json?.data || null);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'خطا در دریافت اطلاعات پایداری داده');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [metadataImportId]);

  const summary = payload?.summary;
  const checks = useMemo(() => (payload?.checks || []).slice(0, 16), [payload?.checks]);
  const signals = useMemo(() => (payload?.driftSignals || []).slice(0, 16), [payload?.driftSignals]);
  const previewEntries = useMemo(() => [
    ['baselineMetadataPreview', payload?.baselineMetadataPreview],
    ['currentMetadataPreview', payload?.currentMetadataPreview],
    ['featureDistributionPreview', payload?.featureDistributionPreview],
    ['missingnessPreview', payload?.missingnessPreview],
    ['targetBalancePreview', payload?.targetBalancePreview],
  ] as Array<[string, Record<string, unknown> | undefined]>, [payload]);

  if (!metadataImportId) return null;

  return (
    <section className="mt-4 rounded-[28px] border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70" aria-label="Offline candidate data drift baseline metadata">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <span className="text-[11px] font-black uppercase tracking-[0.24em] text-violet-500">بررسی تغییرات داده</span>
          <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">بررسی پایداری و تغییرات داده</h3>
          <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">این بخش تغییرات توزیع داده، مقادیر ناقص و توازن داده را بر اساس اطلاعات ثبت‌شده نمایش می‌دهد و هیچ تغییری در عملیات فروشگاه ایجاد نمی‌کند.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">فقط مشاهده · بدون تغییر خودکار اطلاعات فروشگاه</span>
          {onClear ? (
            <button type="button" onClick={onClear} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-600 transition hover:-translate-y-0.5 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">بستن Drift</button>
          ) : null}
        </div>
      </div>

      {error ? <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">{error}</p> : null}

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <article className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <small className="text-xs font-bold text-slate-500">مدل مورد بررسی</small>
          <strong className="mt-1 block truncate text-sm font-black text-slate-900 dark:text-white">{loading ? '…' : summary?.candidatePackageId || '—'}</strong>
          <em className="not-italic text-xs text-slate-500">{summary?.modelVersion || '—'}</em>
        </article>
        <article className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <small className="text-xs font-bold text-slate-500">امتیاز تغییرات داده</small>
          <strong className="mt-1 block text-xl font-black text-slate-900 dark:text-white">{loading ? '…' : `${formatNumber(summary?.driftScorePct)}٪`}</strong>
          <em className="not-italic text-xs text-slate-500">pass {formatNumber(summary?.passCount)} · warn {formatNumber(summary?.warningCount)} · fail {formatNumber(summary?.failCount)}</em>
        </article>
        <article className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <small className="text-xs font-bold text-slate-500">Signals</small>
          <strong className="mt-1 block text-xl font-black text-slate-900 dark:text-white">{loading ? '…' : formatNumber(summary?.availableSignalCount)}</strong>
          <em className="not-italic text-xs text-slate-500">missing: {formatNumber(summary?.missingSignalCount)}</em>
        </article>
        <article className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <small className="text-xs font-bold text-slate-500">Status</small>
          <strong className="mt-1 block text-sm font-black text-slate-900 dark:text-white">{loading ? '…' : statusLabel(summary?.status)}</strong>
          <em className="not-italic text-xs text-slate-500">اطلاعات تحلیلی</em>
        </article>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <h4 className="text-sm font-black text-slate-900 dark:text-white">Baseline drift snapshot</h4>
          <dl className="mt-3 grid gap-2 text-xs">
            <div className="rounded-2xl bg-white px-3 py-2 dark:bg-slate-950">
              <dt className="font-black text-slate-700 dark:text-white">Reference availability</dt>
              <dd className="mt-1 font-bold text-slate-500 dark:text-slate-400">baseline {summary?.baselineReferenceAvailable ? 'yes' : 'no'} · current {summary?.currentReferenceAvailable ? 'yes' : 'no'}</dd>
            </div>
            <div className="rounded-2xl bg-white px-3 py-2 dark:bg-slate-950">
              <dt className="font-black text-slate-700 dark:text-white">Row count drift</dt>
              <dd className="mt-1 font-bold text-slate-500 dark:text-slate-400">baseline {formatNumber(summary?.rowCountBaseline)} · candidate {formatNumber(summary?.rowCountCandidate)} · delta {formatPercent(summary?.rowCountDeltaPct)}</dd>
            </div>
            <div className="rounded-2xl bg-white px-3 py-2 dark:bg-slate-950">
              <dt className="font-black text-slate-700 dark:text-white">Target balance drift</dt>
              <dd className="mt-1 font-bold text-slate-500 dark:text-slate-400">baseline {formatPercent(summary?.targetPositiveRateBaseline)} · candidate {formatPercent(summary?.targetPositiveRateCandidate)} · delta {formatPercent(summary?.targetPositiveRateDelta)}</dd>
            </div>
            <div className="rounded-2xl bg-white px-3 py-2 dark:bg-slate-950">
              <dt className="font-black text-slate-700 dark:text-white">گروه‌های اطلاعات</dt>
              <dd className="mt-1 font-bold text-slate-500 dark:text-slate-400">feature {formatNumber(summary?.featureDistributionCount)} · missingness {formatNumber(summary?.missingnessDriftCount)} · target {formatNumber(summary?.targetBalanceSignalCount)}</dd>
            </div>
          </dl>
        </article>

        <article className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <h4 className="text-sm font-black text-slate-900 dark:text-white">خلاصه اطلاعات</h4>
          <div className="mt-3 grid gap-2 text-xs">
            {previewEntries.map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-white px-3 py-2 dark:bg-slate-950">
                <strong className="block font-black text-slate-700 dark:text-white">{label}</strong>
                <span className="mt-1 block break-words font-bold text-slate-500 dark:text-slate-400">{previewValue(value)}</span>
              </div>
            ))}
          </div>
        </article>
      </div>

      <DataTableShell className="mt-4" aria-label="Data drift signals" data-ui-ml-table="data-drift-signals">
        <Table layout="managed" density="comfortable" className="min-w-full divide-y divide-slate-100 text-right text-xs dark:divide-slate-800">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th className="px-3 py-2 font-black">Signal</th>
              <th className="px-3 py-2 font-black">Family</th>
              <th className="px-3 py-2 font-black">Baseline</th>
              <th className="px-3 py-2 font-black">مدل مورد بررسی</th>
              <th className="px-3 py-2 font-black">Delta</th>
              <th className="px-3 py-2 font-black">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-950">
            {signals.length ? signals.map((signal) => (
              <tr key={signal.key || signal.label}>
                <td className="px-3 py-2 font-black text-slate-900 dark:text-white">{signal.label || signal.key || '—'}</td>
                <td className="px-3 py-2 font-bold text-slate-500">{signal.family || '—'}</td>
                <td className="px-3 py-2 font-bold text-slate-600 dark:text-slate-300">{previewValue(signal.baselineValue)}</td>
                <td className="px-3 py-2 font-bold text-slate-600 dark:text-slate-300">{previewValue(signal.candidateValue)}</td>
                <td className="px-3 py-2 font-bold text-slate-600 dark:text-slate-300">{signal.deltaPct !== null && signal.deltaPct !== undefined ? formatPercent(signal.deltaPct) : previewValue(signal.delta)}</td>
                <td className="px-3 py-2 font-bold text-slate-500">{signal.source || '—'}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center font-bold text-slate-500">هنوز اطلاعات مقایسه تغییرات داده برای این مدل ثبت نشده است.</td>
              </tr>
            )}
          </tbody>
        </Table>
      </DataTableShell>

      <DataTableShell className="mt-4" aria-label="Data drift metadata checklist" data-ui-ml-table="data-drift-checklist">
        <Table layout="managed" density="comfortable" className="min-w-full divide-y divide-slate-100 text-right text-xs dark:divide-slate-800">
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
                <td className="px-3 py-2 font-black text-slate-900 dark:text-white">{check.label || check.key || '—'}</td>
                <td className="px-3 py-2 font-bold text-slate-600 dark:text-slate-300">{checkStatusLabel(check.status)}</td>
                <td className="px-3 py-2 font-bold text-slate-500">{formatNumber(check.earned)} / {formatNumber(check.weight)}</td>
                <td className="px-3 py-2 font-bold text-slate-500">{check.source || '—'}</td>
                <td className="px-3 py-2 font-bold text-slate-500">{check.message || '—'}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center font-bold text-slate-500">هنوز کنترل‌های تغییرات داده برای این مدل ثبت نشده است.</td>
              </tr>
            )}
          </tbody>
        </Table>
      </DataTableShell>

      <p className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
        {summary?.recommendedNextAction || 'این بخش فقط وضعیت پایداری داده را نمایش می‌دهد و باعث فعال‌شدن خودکار مدل نمی‌شود.'}
      </p>
    </section>
  );
}

export default React.memo(OfflineCandidateDataDriftBaselineMetadata);
