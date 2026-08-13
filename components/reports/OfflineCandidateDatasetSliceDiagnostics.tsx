import React, { useEffect, useMemo, useState } from 'react';
import { DataTableShell } from '@/components/ui';
import { apiFetch } from '../../utils/apiFetch';

import { formatExactNumberText, formatExactPercentText } from '../../utils/exactNumber';
type SliceDiagnostic = {
  key?: string;
  label?: string;
  sliceType?: string;
  segment?: string;
  rowCount?: number | null;
  positiveRate?: number | null;
  missingRate?: number | null;
  metricKey?: string | null;
  metricValue?: number | null;
  warning?: string | null;
  source?: string;
};

type SliceFamily = {
  key?: string;
  label?: string;
  count?: number;
  warningCount?: number;
};

type SliceSummary = {
  status?: string;
  candidatePackageId?: string | null;
  modelKey?: string | null;
  modelVersion?: string | null;
  predictionType?: string | null;
  horizonDays?: number | null;
  sliceCount?: number;
  supportedSliceCount?: number;
  warningCount?: number;
  missingnessSliceCount?: number;
  targetDistributionSliceCount?: number;
  metadataReadOnlySliceDiagnostics?: true;
  backendModelExecutionAllowed?: false;
  backendInferenceEndpointExposed?: false;
  productionIntegrationAllowed?: false;
  decisionAutomationAllowed?: false;
  canChangeInventoryOrAccounting?: false;
  artifactActivationAllowed?: false;
  recommendedNextAction?: string;
};

type SlicePayload = {
  summary?: SliceSummary;
  diagnostics?: SliceDiagnostic[];
  sliceFamilies?: SliceFamily[];
  sourceMetadata?: Record<string, boolean>;
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

const formatRate = (value: unknown) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  if (numeric >= 0 && numeric <= 1) return pct.format(numeric);
  return formatExactNumberText(numeric);
};

const statusLabel = (value?: string | null) => {
  const text = String(value || '').trim();
  if (!text) return '—';
  if (text.includes('ready')) return 'آماده بررسی Slice';
  if (text.includes('warning')) return 'دارای هشدار Slice';
  if (text.includes('no_slice')) return 'Slice metadata موجود نیست';
  if (text.includes('not_found')) return 'Candidate یافت نشد';
  return text;
};

const sliceTypeLabel = (value?: string | null) => {
  const labels: Record<string, string> = {
    category: 'دسته‌بندی',
    stock_level_band: 'باند موجودی',
    sales_velocity_band: 'باند سرعت فروش',
    missingness_band: 'باند Missingness',
    target_distribution: 'توزیع Target',
    class_balance: 'توازن کلاس',
    row_count_band: 'حجم داده',
    missingness: 'Missingness',
    slice_metric: 'Slice metric',
  };
  const key = String(value || 'unknown');
  return labels[key] || key.replace(/_/g, ' ');
};

function OfflineCandidateDatasetSliceDiagnostics({ metadataImportId, onClear }: Props) {
  const [payload, setPayload] = useState<SlicePayload | null>(null);
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
        const res = await apiFetch(`/api/brain/ml-datasets/inventory-stockout/candidate-dataset-slice-diagnostics/${metadataImportId}`);
        const json = await res.json().catch(() => null);
        if (!res.ok || json?.success === false) throw new Error(json?.message || 'خطا در دریافت Dataset Slice Diagnostics');
        if (active) setPayload(json?.data || null);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'خطا در دریافت Dataset Slice Diagnostics');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [metadataImportId]);

  const summary = payload?.summary;
  const diagnostics = useMemo(() => (payload?.diagnostics || []).slice(0, 12), [payload?.diagnostics]);
  const families = useMemo(() => (payload?.sliceFamilies || []).slice(0, 8), [payload?.sliceFamilies]);
  const sources = useMemo(() => Object.entries(payload?.sourceMetadata || {}).filter(([, available]) => available).map(([key]) => key), [payload?.sourceMetadata]);

  if (!metadataImportId) return null;

  return (
    <section className="mt-4 rounded-[28px] border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70" aria-label="Offline candidate dataset slice diagnostics">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <span className="text-[11px] font-black uppercase tracking-[0.24em] text-violet-500">Phase 9E · Slice Diagnostics</span>
          <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Dataset Slice Diagnostics آفلاین Candidate</h3>
          <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">این بخش فقط slice metadata واردشده را نمایش می‌دهد؛ backend نه CSV آموزشی را می‌خواند، نه مدل را اجرا می‌کند، نه خروجی را به عمل تجاری تبدیل می‌کند.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">Read-only · No execution · No mutation</span>
          {onClear ? (
            <button type="button" onClick={onClear} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-600 transition hover:-translate-y-0.5 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">بستن Sliceها</button>
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
          <small className="text-xs font-bold text-slate-500">Slice count</small>
          <strong className="mt-1 block text-xl font-black text-slate-900 dark:text-white">{loading ? '…' : nf.format(summary?.sliceCount || 0)}</strong>
          <em className="not-italic text-xs text-slate-500">supported: {nf.format(summary?.supportedSliceCount || 0)}</em>
        </article>
        <article className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <small className="text-xs font-bold text-slate-500">Diagnostics</small>
          <strong className="mt-1 block text-xl font-black text-slate-900 dark:text-white">{loading ? '…' : nf.format(summary?.targetDistributionSliceCount || 0)}</strong>
          <em className="not-italic text-xs text-slate-500">missingness: {nf.format(summary?.missingnessSliceCount || 0)}</em>
        </article>
        <article className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <small className="text-xs font-bold text-slate-500">Status</small>
          <strong className="mt-1 block text-sm font-black text-slate-900 dark:text-white">{loading ? '…' : statusLabel(summary?.status)}</strong>
          <em className="not-italic text-xs text-slate-500">warnings: {nf.format(summary?.warningCount || 0)}</em>
        </article>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <h4 className="text-sm font-black text-slate-900 dark:text-white">Slice families</h4>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {families.length ? families.map((family) => (
              <div key={family.key || family.label} className="rounded-2xl bg-white px-3 py-2 text-xs dark:bg-slate-950">
                <strong className="block font-black text-slate-800 dark:text-white">{sliceTypeLabel(family.key)}</strong>
                <span className="font-bold text-slate-500">{formatNumber(family.count)} slice · warnings {formatNumber(family.warningCount)}</span>
              </div>
            )) : <p className="text-xs font-bold text-slate-500">Slice metadata در candidate واردشده موجود نیست.</p>}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <h4 className="text-sm font-black text-slate-900 dark:text-white">Metadata sources</h4>
          <div className="mt-3 flex flex-wrap gap-2">
            {sources.length ? sources.map((source) => (
              <span key={source} className="rounded-2xl bg-white px-3 py-2 text-xs font-black text-slate-600 dark:bg-slate-950 dark:text-slate-300">{source}</span>
            )) : <span className="text-xs font-bold text-slate-500">منبع slice metadata موجود نیست.</span>}
          </div>
          <p className="mt-3 rounded-2xl bg-white px-3 py-2 text-xs font-bold text-slate-500 dark:bg-slate-950 dark:text-slate-400">Backend فقط JSON metadata را از رکورد import شده می‌خواند؛ فایل train/test CSV و model.joblib خوانده نمی‌شوند.</p>
        </article>
      </div>

      <DataTableShell className="mt-4" aria-label="Dataset slice diagnostics" data-ui-ml-table="dataset-slice-diagnostics">
        <table className="min-w-full divide-y divide-slate-100 text-right text-xs dark:divide-slate-800">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th className="px-3 py-2 font-black">Slice</th>
              <th className="px-3 py-2 font-black">Segment</th>
              <th className="px-3 py-2 font-black">Rows</th>
              <th className="px-3 py-2 font-black">Positive rate</th>
              <th className="px-3 py-2 font-black">Missing rate</th>
              <th className="px-3 py-2 font-black">Metric</th>
              <th className="px-3 py-2 font-black">Warning</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-950">
            {diagnostics.length ? diagnostics.map((diagnostic) => (
              <tr key={diagnostic.key || `${diagnostic.sliceType}-${diagnostic.segment}`}>
                <td className="px-3 py-2 font-black text-slate-800 dark:text-white">{sliceTypeLabel(diagnostic.sliceType)}</td>
                <td className="px-3 py-2 font-bold text-slate-600 dark:text-slate-300">{diagnostic.segment || diagnostic.label || '—'}</td>
                <td className="px-3 py-2 font-bold text-slate-600 dark:text-slate-300">{formatNumber(diagnostic.rowCount)}</td>
                <td className="px-3 py-2 font-bold text-slate-600 dark:text-slate-300">{formatRate(diagnostic.positiveRate)}</td>
                <td className="px-3 py-2 font-bold text-slate-600 dark:text-slate-300">{formatRate(diagnostic.missingRate)}</td>
                <td className="px-3 py-2 font-bold text-slate-600 dark:text-slate-300">{diagnostic.metricKey ? `${diagnostic.metricKey}: ${formatRate(diagnostic.metricValue)}` : '—'}</td>
                <td className="px-3 py-2 font-bold text-amber-600 dark:text-amber-300">{diagnostic.warning || '—'}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center font-bold text-slate-500">برای این candidate هنوز slice diagnostics metadata وارد نشده است.</td>
              </tr>
            )}
          </tbody>
        </table>
      </DataTableShell>

      <p className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
        {summary?.recommendedNextAction || 'این صفحه فقط slice metadata را نشان می‌دهد؛ production inference، activation و business mutation همچنان غیرفعال است.'}
      </p>
    </section>
  );
}

export default React.memo(OfflineCandidateDatasetSliceDiagnostics);
