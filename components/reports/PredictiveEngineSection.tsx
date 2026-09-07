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
      label: 'ارزیابی ایمن',
      score: shadowScore,
      hint: 'میزان آمادگی برای ارزیابی کنترل‌شده و بدون اثر روی عملیات فروشگاه',
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
      hint: 'هیچ تغییری در فروش، انبار یا حسابداری بدون تأیید مدیر انجام نمی‌شود',
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
      dir="rtl"
    >
      <header className="smart-readiness-v214__header">
        <div>
          <span className="smart-readiness-v214__eyebrow">خلاصه مدیریتی سیستم هوشمند</span>
          <h3>پیشرفت کلی سیستم: {formatReadablePercentText(overallScore, 1)}</h3>
          <p>این بخش وضعیت آمادگی داده، تحلیل هوشمند، ارزیابی ایمن و استفاده عملیاتی را به‌صورت مدیریتی نمایش می‌دهد.</p>
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
