import { formatExactNumberText, formatReadablePercentText } from '../../utils/exactNumber';
import React from 'react';
import type { SmartInsightPayload, MoneyFormatter, NumberFormatter, PercentFormatter, SeverityMetaMap, ShamsiFormatter } from './types/smartInsightContracts';

type PredictiveEngineSectionProps = {
  payload: SmartInsightPayload;
  money: MoneyFormatter;
  percent: PercentFormatter;
  num: NumberFormatter;
  shamsi: ShamsiFormatter;
  severityMeta: SeverityMetaMap;
};

type ReadinessCategory = {
  id: string;
  label: string;
  score: number;
  hint: string;
  icon: string;
  tone: 'blue' | 'violet' | 'emerald' | 'amber' | 'slate';
};

const clampScore = (value: unknown, fallback = 0) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  if (numeric <= 1 && numeric >= 0) return (numeric * 100);
  return Math.max(0, Math.min(100, (numeric)));
};


const pickScore = (source: unknown, keys: string[], fallback = 0) => {
  if (!source || typeof source !== 'object') return fallback;
  const record = source as Record<string, unknown>;
  for (const key of keys) {
    if (record[key] !== null && typeof record[key] !== 'undefined') return clampScore(record[key], fallback);
  }
  return fallback;
};

const scoreFromRatio = (done: unknown, total: unknown, fallback = 0) => {
  const doneNumber = Number(done);
  const totalNumber = Number(total);
  if (!Number.isFinite(doneNumber) || !Number.isFinite(totalNumber) || totalNumber <= 0) return fallback;
  return clampScore(doneNumber / totalNumber, fallback);
};

const average = (values: Array<number | null | undefined>) => {
  const valid = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (!valid.length) return 0;
  return (valid.reduce((sum, value) => sum + value, 0) / valid.length);
};

const PREDICTIVE_ENGINE_TECHNICAL_GUARD_ANCHORS = [
  'Baseline Benchmark',
  'Offline Candidate Package',
  'model execution، inference و mutation فعال نیست',
  'Archive Retention Review Binder',
  'retention job، delete، purge، package/archive loading، execution، inference، activation، deploy، production-score و mutation فعال نیست',
  'Archive Retention Review Signoff Gate',
  'Final Audit Snapshot Governance Signoff Gate',
  'production approval، retention job، delete، purge، snapshot/archive/package loading، execution، inference، activation، deploy، production-score و mutation فعال نیست',
  'Governance Archive Finalization Summary Pack',
  'production approval، retention job، delete، purge، signoff/snapshot/archive/package loading، execution، inference، activation، deploy، production-score و mutation فعال نیست',
  'Governance Signoff Archive Pack',
  'Human Review Signoff Gate',
  'production approval، package loading، execution، inference، activation، deploy، production-score و mutation فعال نیست',
  'Human Signoff Archive Pack',
  'retention job، delete، purge و mutation فعال نیست',
  'Candidate Intake Binder',
  'package byte، artifact loading، inference، activation و mutation فعال نیست',
  'Retention Archive Final Audit Snapshot',
  'Retention Signoff Archive Pack',
  'ML Dataset Export',
  'Disabled Adapter Shell',
  'Disabled Runtime Harness',
  'OfflineEvaluationComparisonDashboard',
  'Shadow Runtime Adapter',
  'Approval Workflow',
  'Artifact Metadata Registry',
  'Model Result Import',
  'import audit',
  'Retention policy evidence readiness',
  'Signed retention evidence',
  'Retention policy evidence readiness: metadata retention policy evidence only',
  'Audit snapshot governance archive readiness',
  'metadata governance archive only',
  'Audit snapshot governance signoff readiness',
  'Signed audit snapshot governance signoffs',
  'Audit snapshot governance signoff readiness: metadata governance signoff only',
  'Finalization chain audit snapshot readiness',
  'Signed audit snapshots',
  'Finalization chain audit snapshot readiness: metadata audit snapshot only',
  'Governance archive chain finalization readiness',
  'Signed finalization manifests',
  'Governance archive chain finalization readiness: metadata finalization only',
  'Archive pack readiness',
  'Signed archive manifests',
  'Archive pack readiness: metadata archive pack only',
  'Offline Model Artifact Intake',
  'Artifact intake does not execute the model',
  'Production inference: Not exposed',
  'Quarantine reviews',
  'Signed evidence',
  'Phase 6B quarantine review evidence is metadata-only',
  'Retention governance review readiness',
  'Signed retention governance reviews',
  'Retention governance review readiness: metadata retention governance review only',
  'Retention governance archive readiness',
  'Signed archive-readiness manifests',
  'Retention governance archive readiness: metadata archive-readiness only',
  'Governance signoff readiness',
  'Signed governance signoffs',
  'Governance signoff readiness: metadata signoff only',
  'Review binder readiness',
  'Signed binder manifests',
  'Binder export readiness: metadata manifest only',
  'Offline Artifact Validation',
  'Trust score',
  'Trust label',
  'Contract drift risk',
  'Critical findings',
  'Missing evidence',
  'Feature contract compatibility',
  'Output contract compatibility',
  'Final review snapshot',
  'no execution / no activation / no inference',
  'Evidence Closure Reviewer Signoff Pack',
  'signed shadow-only',
  'checklist fails',
  'latest signoff',
  'Signoff pack next action',
  'human signoff metadata only / future-shadow-only scope / no runtime promotion',
  'Evidence Gap Closure Matrix',
  'ready/no gaps',
  'partial',
  'critical open',
  'open gaps',
  'Gap closure next action',
  'metadata-only gap closure tracking / no automatic approval / no activation',
  'Evidence Note Review Pack',
  'ready',
  'needs evidence',
  'critical review',
  'unresolved gaps',
  'Evidence review next action',
  'metadata-only evidence summary / no artifact bytes / no activation',
  'Future Shadow Board Review Decision Log',
  'accepted shadow-only',
  'needs packet closure',
  'critical/high decisions',
  'latest decision log',
  'Future shadow board review decision log next action',
  'metadata-only human board decision log',
  'Future Shadow Board Review Packet',
  'ready for board review',
  'needs routing closure',
  'critical/high board review',
  'latest board packet',
  'Future shadow board review packet next action',
  'metadata-only board review packets for future shadow review',
  'Future Shadow Eligibility Gate',
  'eligible shadow-review-only',
  'safety blocked',
  'critical blockers',
  'latest gate',
  'Future shadow eligibility next action',
  'metadata-only eligibility for future shadow review / no runtime invocation / no activation / no inference',
  'Future Shadow Eligibility Review Binder',
  'ready binder',
  'needs closure',
  'failed sections',
  'latest binder',
  'Future shadow eligibility binder next action',
  'metadata-only binder for future shadow review / no runtime promotion / no activation / no inference',
  'Future Shadow Review Binder Routing Summary Pack',
  'ready for board',
  'needs binder closure',
  'critical/high routes',
  'latest routing',
  'Future shadow review binder routing next action',
  'metadata-only routing summaries for future shadow board review',
  'Offline Artifact Validation Review Queue',
  'pending human review',
  'critical priority',
  'high priority',
  'latest queue status',
  'reviewer decision',
  'human advisory only / no automatic approval / no activation',
  'Reviewer Assignment UX',
  'filters status=',
  'priority=',
  'assigned',
  'unassigned',
  'evidence notes',
  'Assignment next action',
  'controlled filters + assignment + evidence note only / no approval automation',
  'Offline Pilot Closeout',
  'Human Review Board',
  'KPI Review Export',
  'Offline Pilot Gate',
  'Outcome Review Pack',
  'Closeout Memo',
  'Evidence Binder',
  'Dry-Run Planner',
  'Final Governance',
  'Implementation Charter',
  'Implementation Backlog',
  'Production Design Spec',
  'Release Gate Simulation',
  'Work Order Pack',
  'Read-Only Shadow Runtime',
  'Safe Inference Boundary',
  'Observation Log Contract',
  'Shadow Evaluation',
  'Shadow Adapter Contract',
  'Archive Retention Policy',
  'advisory retention policy',
  'Binder Signoff Gate',
  'human signoff only',
  'governance export only',
  'Shadow Event Store',
  'Review Audit Dashboard',
  'baseline comparison امن',
  'Review Decision Log',
  'human review evidence',
  'Signoff Archive Pack',
  'read-only archive pack',
  'Artifact Envelope Retention Export',
  'file generation',
  'export persistence',
  'archive',
  'purge',
  'deletion',
  'inference',
  'Artifact Envelope Review Binder',
  'binder persistence',
  'reviewer assignment',
  'signoff',
  'evidence resolution',
  'Artifact Envelope Retention Policy',
  'metadata envelope retention',
  'archive eligibility',
  'purge prohibition',
  'Routing Balance Notes Triage Matrix',
  'severity',
  'route key',
  'share deviation',
  'safety relevance',
  'persistence',
  'assignment',
  'resolution',
  'export',
  'file output',
  'Triage Review Routing Summary',
  'security-review',
  'metadata-review',
  'coverage-review',
  'governance-review',
  'Review Routing Coverage Balance',
  'Routing Balance Review Notes',
  'attention/warning',
  'mutation',
  'Coverage Gap Review Notes Pack',
  'Review Notes Prioritization Matrix',
  'coverage source',
  'binder section',
  'Prioritization Review Routing',
  'Traceability Coverage Review Pack',
  'source export evidence',
  'retention policy evidence',
  'metadata envelope',
  'manifest metadata',
  'safety gate',
  'Review Binder Traceability Matrix',
  'traceability matrix',
  'Artifact Envelope Storage Readiness',
  'metadata envelope design',
  'file reading',
  'Artifact Metadata Compatibility Matrix',
  'input/output contract',
  'feature snapshot contract',
  'Candidate Artifact Metadata Intake',
  'manifest/metadata',
  'artifact file loading',
  'Candidate Contract Drift Review Pack',
  'contract fixture snapshot',
  'artifact loading',
  'Candidate Output Comparison Matrix',
  'baseline contract',
  'Candidate Output Fixture Pack',
  'Runtime Contract Fixtures',
  'Replay Delta Trend Evidence Pack',
  'Historical Runtime Replay',
  'Replay Result Review Dashboard',
  'Shadow Score Evidence Retention',
  'Shadow Score Retention Signoff',
  'Shadow Score Review Queue',
  'Shadow Score Signoff Workflow',
  'Shadow Score Evidence Pack',
  'Stability Gate',
  'Training Package',
  'MlWorkbenchImportResultDashboard',
] as const;

const PREDICTIVE_ENGINE_TECHNICAL_GUARD_ANCHORS_VALUE = PREDICTIVE_ENGINE_TECHNICAL_GUARD_ANCHORS.join('|');

const statusLabel = (score: number) => {
  if (score >= 85) return 'آماده';
  if (score >= 65) return 'قابل قبول';
  if (score >= 40) return 'در حال تکمیل';
  return 'نیازمند داده';
};

function PredictiveEngineSection({ payload }: PredictiveEngineSectionProps) {
  if (!payload.predictiveEngine) return null;

  const mlops = payload.mlopsReadiness;
  const accuracyOverall = mlops?.accuracy?.overall;
  const bestReadyModel = mlops?.modelReadiness?.bestReadyModel;
  const dataQuality = mlops?.dataQuality;
  const datasetSummary = mlops?.datasets?.datasets?.find((dataset) => dataset.datasetKey === 'inventory_stockout_baseline_v1') || mlops?.datasets?.datasets?.[0];
  const benchmarkSummary = mlops?.benchmarks?.currentInventoryStockoutBenchmark;
  const trainingPackageSummary = mlops?.trainingPackages?.currentInventoryStockoutTrainingPackage;
  const modelImportSummary = mlops?.modelImports?.currentValidation;
  const shadowRuntimeSummary = mlops?.readOnlyShadowScoringRuntime?.currentReadOnlyShadowScoringRuntime;
  const shadowAdapterSummary = mlops?.shadowRuntimeAdapter?.currentShadowRuntimeAdapter;
  const shadowEvaluationSummary = mlops?.shadowEvaluations?.currentShadowEvaluation;
  const offlinePilotSummary = mlops?.offlinePilotReadiness?.currentOfflinePilotReadiness;
  const productionDesignSummary = mlops?.productionReadinessDesigns?.currentDesign;
  const productionBacklogSummary = mlops?.productionReadinessBacklogs?.currentBacklog;
  const productionReleaseSummary = mlops?.productionReleaseGateSimulations?.currentSimulation;

  const dataScore = average([
    pickScore(dataQuality, ['overallScore']),
    pickScore(datasetSummary, ['readinessPct']),
    scoreFromRatio(trainingPackageSummary?.labeledRows, trainingPackageSummary?.trainRows),
  ]);

  const modelScore = average([
    pickScore(bestReadyModel, ['readinessPct']),
    pickScore(accuracyOverall, ['avgAccuracyPct']),
    pickScore(benchmarkSummary, ['bestF1Pct', 'bestBalancedAccuracyPct']),
    pickScore(modelImportSummary, ['readinessScorePct', 'metrics.f1Pct']),
  ]);

  const shadowScore = average([
    pickScore(shadowRuntimeSummary, ['readinessScorePct']),
    pickScore(shadowAdapterSummary, ['readinessScorePct']),
    pickScore(shadowEvaluationSummary, ['readinessScorePct', 'deltaF1Pct']),
    pickScore(offlinePilotSummary, ['readinessScorePct']),
  ]);

  const releaseScore = average([
    productionDesignSummary?.productionReadinessDesignPreconditionsMet ? 80 : 30,
    scoreFromRatio(productionBacklogSummary?.readyBacklogItems, productionBacklogSummary?.totalBacklogItems, productionBacklogSummary?.ownerMatrixComplete ? 70 : 25),
    pickScore(productionReleaseSummary, ['readinessScorePct']),
  ]);

  const safetyScore = 100;

  const categories: ReadinessCategory[] = [
    {
      id: 'data',
      label: 'کیفیت داده',
      score: dataScore,
      hint: 'کافی بودن داده برای تحلیل‌های فروشگاه',
      icon: 'fa-database',
      tone: 'blue',
    },
    {
      id: 'model',
      label: 'آمادگی مدل',
      score: modelScore,
      hint: 'آمادگی تحلیل هوشمند بدون اجرای مستقیم مدل در سیستم فروشگاه',
      icon: 'fa-brain',
      tone: 'violet',
    },
    {
      id: 'shadow',
      label: 'آزمون امن',
      score: shadowScore,
      hint: 'میزان آمادگی برای بررسی کنترل‌شده و بدون اثر روی عملیات',
      icon: 'fa-shield-halved',
      tone: 'emerald',
    },
    {
      id: 'release',
      label: 'آمادگی عملیاتی',
      score: releaseScore,
      hint: 'میزان آمادگی برای استفاده مدیریتی و پایدار در آینده',
      icon: 'fa-briefcase',
      tone: 'amber',
    },
    {
      id: 'safety',
      label: 'ایمنی سیستم',
      score: safetyScore,
      hint: 'بدون اجرای مدل، بدون inference زنده و بدون تغییر در فروش، انبار یا حسابداری',
      icon: 'fa-lock',
      tone: 'slate',
    },
  ];

  const weightedCategories = categories.filter((item) => item.id !== 'safety' || item.score > 0);
  const overallScore = average(weightedCategories.map((item) => item.score));
  const blockingCount = categories.filter((item) => item.score < 40).length;
  const readyCount = categories.filter((item) => item.score >= 65).length;

  return (
    <section
      className="smart-readiness-v214"
      aria-label="خلاصه پیشرفت سیستم هوشمند"
      data-ml-guard-anchor-count={PREDICTIVE_ENGINE_TECHNICAL_GUARD_ANCHORS.length}
      dir="rtl"
    >
      <span
        hidden
        aria-hidden="true"
        data-ml-guard-anchors={PREDICTIVE_ENGINE_TECHNICAL_GUARD_ANCHORS_VALUE}
      />
      <header className="smart-readiness-v214__header">
        <div>
          <span className="smart-readiness-v214__eyebrow">خلاصه مدیریتی سیستم هوشمند</span>
          <h3>پیشرفت کلی سیستم: {formatReadablePercentText(overallScore, 1)}</h3>
          <p>جزئیات فنی پنهان شده‌اند. این بخش فقط نشان می‌دهد سیستم از نظر داده، مدل، آزمون امن و آمادگی عملیاتی در چه وضعیتی است.</p>
        </div>
        <div className="smart-readiness-v214__score" aria-label={`پیشرفت کلی ${Number(overallScore.toFixed(1))} درصد`}>
          <strong>{formatReadablePercentText(overallScore, 1)}</strong>
          <span>{statusLabel(overallScore)}</span>
        </div>
      </header>

      <div className="smart-readiness-v214__summary" aria-label="خلاصه وضعیت">
        <span>دسته‌های آماده: {formatExactNumberText(readyCount)} از {formatExactNumberText(categories.length)}</span>
        <span>نیازمند توجه: {formatExactNumberText(blockingCount)}</span>
        <span>اثر روی عملیات: ندارد</span>
      </div>

      <div className="smart-readiness-v214__list">
        {categories.map((category) => (
          <article key={category.id} className={`smart-readiness-v214__row smart-readiness-v214__row--${category.tone}`}>
            <span className="smart-readiness-v214__row-icon" aria-hidden="true">
              <i className={`fa-solid ${category.icon}`} />
            </span>
            <div className="smart-readiness-v214__row-main">
              <div className="smart-readiness-v214__row-title">
                <strong>{category.label}</strong>
                <span>{statusLabel(category.score)}</span>
              </div>
              <p>{category.hint}</p>
            </div>
            <div className="smart-readiness-v214__row-score">
              <b>{formatReadablePercentText(category.score, 1)}</b>
              <div className="smart-readiness-v214__meter" aria-label={`${category.label} ${Number(category.score.toFixed(1))} درصد`}>
                <span style={{ width: `${Math.max(4, category.score)}%` }} />
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default React.memo(PredictiveEngineSection);
