import React, { useEffect, useMemo, useState } from 'react';
import { DataTableShell, TableActionGroup, type TableActionItem } from '@/components/ui';
import { apiFetch } from '../../utils/apiFetch';
import OfflineCandidateMetricDrilldown from './OfflineCandidateMetricDrilldown';
import OfflineCandidateDatasetSliceDiagnostics from './OfflineCandidateDatasetSliceDiagnostics';
import OfflineCandidateModelCardQualityScoring from './OfflineCandidateModelCardQualityScoring';
import OfflineCandidateTrainingPackageQualitySnapshot from './OfflineCandidateTrainingPackageQualitySnapshot';
import OfflineCandidateDataDriftBaselineMetadata from './OfflineCandidateDataDriftBaselineMetadata';
import OfflineCandidateFeatureContractDriftMetadata from './OfflineCandidateFeatureContractDriftMetadata';
import OfflineCandidateThresholdScenarioMetadata from './OfflineCandidateThresholdScenarioMetadata';
import OfflineCandidateCalibrationMetadata from './OfflineCandidateCalibrationMetadata';
import OfflineCandidateErrorAnalysisMetadata from './OfflineCandidateErrorAnalysisMetadata';
import OfflineCandidateRobustnessMetadata from './OfflineCandidateRobustnessMetadata';
import OfflineCandidateDeploymentReadinessMetadata from './OfflineCandidateDeploymentReadinessMetadata';

import { formatExactNumberText, formatExactPercentText } from '../../utils/exactNumber';
type DashboardRow = {
  id?: number | null;
  rank?: number;
  candidatePackageId?: string | null;
  modelKey?: string | null;
  modelVersion?: string | null;
  predictionType?: string | null;
  horizonDays?: number | null;
  f1?: number | null;
  recallScore?: number | null;
  precisionScore?: number | null;
  rocAuc?: number | null;
  accuracy?: number | null;
  r2?: number | null;
  rmse?: number | null;
  mae?: number | null;
  comparisonScore?: number | null;
  comparisonBasis?: string;
  validationStatus?: string | null;
  metricsStatus?: string | null;
  outputContractStatus?: string | null;
  safetyPolicyStatus?: string | null;
  metadataImportStatus?: string | null;
  createdAt?: string | null;
};

type DashboardSummary = {
  status?: string;
  recommendation?: string;
  candidateCount?: number;
  comparableCandidateCount?: number;
  safeMetadataCandidateCount?: number;
  warningCandidateCount?: number;
  blockedCandidateCount?: number;
  bestCandidatePackageId?: string | null;
  bestModelVersion?: string | null;
  bestComparisonScore?: number | null;
  bestComparisonBasis?: string | null;
  backendModelExecutionAllowed?: false;
  backendInferenceEndpointExposed?: false;
  productionIntegrationAllowed?: false;
  decisionAutomationAllowed?: false;
  canChangeInventoryOrAccounting?: false;
  artifactActivationAllowed?: false;
  recommendedNextAction?: string;
};

type DashboardPayload = {
  summary?: DashboardSummary;
  rows?: DashboardRow[];
};

const nf = { format: (value: unknown) => formatExactNumberText(value) };
const pct = { format: (value: unknown) => formatExactPercentText(Number(value || 0) * 100) };

const formatMetric = (value: unknown, basis?: string) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  if (String(basis || '').includes('inverse')) return formatExactNumberText(numeric);
  if (numeric >= 0 && numeric <= 1) return pct.format(numeric);
  return formatExactNumberText(numeric);
};

const statusLabel = (value?: string | null) => {
  const text = String(value || '').trim();
  if (!text) return '—';
  if (text.includes('ready')) return 'آماده مقایسه';
  if (text.includes('warning')) return 'نیازمند بررسی';
  if (text.includes('rejected') || text.includes('block')) return 'مسدود';
  if (text === 'pass') return 'ایمن';
  return text;
};

function OfflineEvaluationComparisonDashboard() {
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDrilldownId, setSelectedDrilldownId] = useState<number | null>(null);
  const [selectedSliceDiagnosticsId, setSelectedSliceDiagnosticsId] = useState<number | null>(null);
  const [selectedModelCardQualityId, setSelectedModelCardQualityId] = useState<number | null>(null);
  const [selectedTrainingPackageQualityId, setSelectedTrainingPackageQualityId] = useState<number | null>(null);
  const [selectedDataDriftBaselineId, setSelectedDataDriftBaselineId] = useState<number | null>(null);
  const [selectedFeatureContractDriftId, setSelectedFeatureContractDriftId] = useState<number | null>(null);
  const [selectedThresholdScenarioMetadataId, setSelectedThresholdScenarioMetadataId] = useState<number | null>(null);
  const [selectedCalibrationMetadataId, setSelectedCalibrationMetadataId] = useState<number | null>(null);
  const [selectedErrorAnalysisMetadataId, setSelectedErrorAnalysisMetadataId] = useState<number | null>(null);
  const [selectedRobustnessMetadataId, setSelectedRobustnessMetadataId] = useState<number | null>(null);
  const [selectedDeploymentReadinessMetadataId, setSelectedDeploymentReadinessMetadataId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch('/api/brain/ml-datasets/inventory-stockout/evaluation-comparison-dashboard?limit=8');
        const json = await res.json().catch(() => null);
        if (!res.ok || json?.success === false) throw new Error(json?.message || 'خطا در دریافت داشبورد مقایسه مدل‌ها');
        if (active) setDashboard(json?.data || null);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'خطا در دریافت داشبورد مقایسه مدل‌ها');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  const summary = dashboard?.summary;
  const rows = useMemo(() => (dashboard?.rows || []).slice(0, 5), [dashboard?.rows]);
  const hasRows = rows.length > 0;

  const buildRowActions = (row: DashboardRow): TableActionItem[] => [
    {
      key: 'metric-drilldown',
      kind: 'button',
      label: 'Metric drilldown',
      tooltip: 'Metric drilldown',
      variant: 'secondary',
      disabled: !row.id,
      icon: <i className="fa-solid fa-chart-column" aria-hidden="true" />,
      onClick: () => setSelectedDrilldownId(Number(row.id)),
    },
    {
      key: 'slice-diagnostics',
      kind: 'button',
      label: 'Slice diagnostics',
      tooltip: 'Slice diagnostics',
      variant: 'secondary',
      disabled: !row.id,
      icon: <i className="fa-solid fa-layer-group" aria-hidden="true" />,
      onClick: () => setSelectedSliceDiagnosticsId(Number(row.id)),
    },
    {
      key: 'model-card-quality',
      kind: 'button',
      label: 'Model card score',
      tooltip: 'Model card score',
      variant: 'secondary',
      disabled: !row.id,
      icon: <i className="fa-solid fa-id-card" aria-hidden="true" />,
      onClick: () => setSelectedModelCardQualityId(Number(row.id)),
    },
    {
      key: 'training-package-quality',
      kind: 'button',
      label: 'Training package quality',
      tooltip: 'Training package quality',
      variant: 'secondary',
      disabled: !row.id,
      icon: <i className="fa-solid fa-box-archive" aria-hidden="true" />,
      onClick: () => setSelectedTrainingPackageQualityId(Number(row.id)),
    },
    {
      key: 'data-drift-baseline',
      kind: 'button',
      label: 'Data drift baseline',
      tooltip: 'Data drift baseline',
      variant: 'secondary',
      disabled: !row.id,
      icon: <i className="fa-solid fa-wave-square" aria-hidden="true" />,
      onClick: () => setSelectedDataDriftBaselineId(Number(row.id)),
    },
    {
      key: 'feature-contract-drift',
      kind: 'button',
      label: 'Feature contract drift',
      tooltip: 'Feature contract drift',
      variant: 'secondary',
      disabled: !row.id,
      icon: <i className="fa-solid fa-code-branch" aria-hidden="true" />,
      onClick: () => setSelectedFeatureContractDriftId(Number(row.id)),
    },
    {
      key: 'threshold-scenarios',
      kind: 'button',
      label: 'Threshold scenarios',
      tooltip: 'Threshold scenarios',
      variant: 'secondary',
      disabled: !row.id,
      icon: <i className="fa-solid fa-sliders" aria-hidden="true" />,
      onClick: () => setSelectedThresholdScenarioMetadataId(Number(row.id)),
    },
    {
      key: 'calibration-metadata',
      kind: 'button',
      label: 'Calibration metadata',
      tooltip: 'Calibration metadata',
      variant: 'secondary',
      disabled: !row.id,
      icon: <i className="fa-solid fa-bullseye" aria-hidden="true" />,
      onClick: () => setSelectedCalibrationMetadataId(Number(row.id)),
    },
    {
      key: 'error-analysis',
      kind: 'button',
      label: 'Error analysis',
      tooltip: 'Error analysis',
      variant: 'secondary',
      disabled: !row.id,
      icon: <i className="fa-solid fa-bug" aria-hidden="true" />,
      onClick: () => setSelectedErrorAnalysisMetadataId(Number(row.id)),
    },
    {
      key: 'robustness-metadata',
      kind: 'button',
      label: 'Robustness metadata',
      tooltip: 'Robustness metadata',
      variant: 'secondary',
      disabled: !row.id,
      icon: <i className="fa-solid fa-shield-heart" aria-hidden="true" />,
      onClick: () => setSelectedRobustnessMetadataId(Number(row.id)),
    },
    {
      key: 'deployment-readiness',
      kind: 'button',
      label: 'Deployment readiness',
      tooltip: 'Deployment readiness',
      variant: 'secondary',
      disabled: !row.id,
      icon: <i className="fa-solid fa-rocket" aria-hidden="true" />,
      onClick: () => setSelectedDeploymentReadinessMetadataId(Number(row.id)),
    },
  ];

  return (
    <section className="rounded-[28px] border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70" aria-label="Offline evaluation comparison dashboard">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <span className="text-[11px] font-black uppercase tracking-[0.24em] text-indigo-500">Phase 9C/9D/9E/9F/9G/9H/9I/9J/9K/9L · Metadata Only</span>
          <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">داشبورد مقایسه، Drilldown، Slice Diagnostics، Model Card Quality، Training Package Quality، Data Drift Baseline، Feature Contract Drift، Threshold Scenario، Calibration Metadata و Error Analysis آفلاین Candidate Modelها</h3>
          <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">فقط متادیتای import شده از Phase 9B مقایسه می‌شود؛ مدل اجرا، فعال یا وارد runtime نمی‌شود.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          Execution Off · Inference Off · Activation Off
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <article className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <small className="text-xs font-bold text-slate-500">Candidateها</small>
          <strong className="mt-1 block text-xl font-black text-slate-900 dark:text-white">{loading ? '…' : nf.format(summary?.candidateCount || 0)}</strong>
          <em className="not-italic text-xs text-slate-500">قابل مقایسه: {nf.format(summary?.comparableCandidateCount || 0)}</em>
        </article>
        <article className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <small className="text-xs font-bold text-slate-500">Safety pass</small>
          <strong className="mt-1 block text-xl font-black text-slate-900 dark:text-white">{loading ? '…' : nf.format(summary?.safeMetadataCandidateCount || 0)}</strong>
          <em className="not-italic text-xs text-slate-500">Blocked: {nf.format(summary?.blockedCandidateCount || 0)}</em>
        </article>
        <article className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <small className="text-xs font-bold text-slate-500">Best metadata score</small>
          <strong className="mt-1 block text-xl font-black text-slate-900 dark:text-white">{loading ? '…' : formatMetric(summary?.bestComparisonScore, summary?.bestComparisonBasis || undefined)}</strong>
          <em className="not-italic text-xs text-slate-500">{summary?.bestComparisonBasis || 'no metric'}</em>
        </article>
        <article className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <small className="text-xs font-bold text-slate-500">Dashboard status</small>
          <strong className="mt-1 block text-lg font-black text-slate-900 dark:text-white">{loading ? '…' : statusLabel(summary?.status)}</strong>
          <em className="not-italic text-xs text-slate-500">metadata-only</em>
        </article>
      </div>

      {error ? (
        <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">{error}</p>
      ) : null}

      {hasRows ? (
        <DataTableShell
          className="mt-4"
          aria-label="Offline evaluation candidate comparison"
          data-ui-ml-table="offline-evaluation-comparison"
        >
          <table className="w-full min-w-[1120px] divide-y divide-slate-100 text-right text-xs dark:divide-slate-800">
            <thead className="bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2 font-black">رتبه</th>
                <th className="px-3 py-2 font-black">Candidate</th>
                <th className="px-3 py-2 font-black">Version</th>
                <th className="px-3 py-2 font-black">Score</th>
                <th className="px-3 py-2 font-black">F1</th>
                <th className="px-3 py-2 font-black">Recall</th>
                <th className="px-3 py-2 font-black">Safety</th>
                <th className="px-3 py-2 font-black">جزئیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-950">
              {rows.map((row) => (
                <tr key={`${row.id || row.candidatePackageId}-${row.rank}`}>
                  <td className="px-3 py-2 font-black text-slate-900 dark:text-white">{nf.format(row.rank || 0)}</td>
                  <td className="px-3 py-2 font-bold text-slate-700 dark:text-slate-200">{row.candidatePackageId || row.modelKey || '—'}</td>
                  <td className="px-3 py-2 font-bold text-slate-500">{row.modelVersion || '—'}</td>
                  <td className="px-3 py-2 font-black text-slate-900 dark:text-white">{formatMetric(row.comparisonScore, row.comparisonBasis)}</td>
                  <td className="px-3 py-2 font-bold text-slate-600 dark:text-slate-300">{formatMetric(row.f1)}</td>
                  <td className="px-3 py-2 font-bold text-slate-600 dark:text-slate-300">{formatMetric(row.recallScore)}</td>
                  <td className="px-3 py-2 font-bold text-slate-600 dark:text-slate-300">{statusLabel(row.safetyPolicyStatus)} / {statusLabel(row.outputContractStatus)}</td>
                  <td className="px-3 py-2">
                    <TableActionGroup
                      ariaLabel={`جزئیات Candidate ${row.candidatePackageId || row.modelKey || row.rank || ''}`}
                      collapseBelow="xl"
                      align="start"
                      actions={buildRowActions(row)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>
      ) : (
        <p className="mt-4 rounded-2xl bg-slate-50 px-3 py-3 text-xs font-bold text-slate-500 dark:bg-slate-900 dark:text-slate-400">هنوز candidate evaluation metadata برای مقایسه import نشده است.</p>
      )}

      <OfflineCandidateMetricDrilldown metadataImportId={selectedDrilldownId} onClear={() => setSelectedDrilldownId(null)} />
      <OfflineCandidateDatasetSliceDiagnostics metadataImportId={selectedSliceDiagnosticsId} onClear={() => setSelectedSliceDiagnosticsId(null)} />
      <OfflineCandidateModelCardQualityScoring metadataImportId={selectedModelCardQualityId} onClear={() => setSelectedModelCardQualityId(null)} />
      <OfflineCandidateTrainingPackageQualitySnapshot metadataImportId={selectedTrainingPackageQualityId} onClear={() => setSelectedTrainingPackageQualityId(null)} />
      <OfflineCandidateDataDriftBaselineMetadata metadataImportId={selectedDataDriftBaselineId} onClear={() => setSelectedDataDriftBaselineId(null)} />
      <OfflineCandidateFeatureContractDriftMetadata metadataImportId={selectedFeatureContractDriftId} onClear={() => setSelectedFeatureContractDriftId(null)} />
      <OfflineCandidateThresholdScenarioMetadata metadataImportId={selectedThresholdScenarioMetadataId} onClear={() => setSelectedThresholdScenarioMetadataId(null)} />
      <OfflineCandidateCalibrationMetadata metadataImportId={selectedCalibrationMetadataId} onClear={() => setSelectedCalibrationMetadataId(null)} />
      <OfflineCandidateErrorAnalysisMetadata metadataImportId={selectedErrorAnalysisMetadataId} onClear={() => setSelectedErrorAnalysisMetadataId(null)} />
      <OfflineCandidateRobustnessMetadata metadataImportId={selectedRobustnessMetadataId} onClear={() => setSelectedRobustnessMetadataId(null)} />
      <OfflineCandidateDeploymentReadinessMetadata metadataImportId={selectedDeploymentReadinessMetadataId} onClear={() => setSelectedDeploymentReadinessMetadataId(null)} />

      <p className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
        {summary?.recommendedNextAction || 'این داشبورد فقط برای مشاهده و مقایسه metadata است؛ production inference، activation و business mutation همچنان غیرفعال است.'}
      </p>
    </section>
  );
}

export default React.memo(OfflineEvaluationComparisonDashboard);
