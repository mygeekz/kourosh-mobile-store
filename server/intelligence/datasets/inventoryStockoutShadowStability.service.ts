import {
  listMlModelResultImports,
  listMlShadowEvaluations,
  listMlShadowEvaluationsByImportId,
  listMlShadowStabilityChecks,
  recordMlShadowStabilityCheck,
} from "../../db/domains/mlDatasets.db";
import type {
  InventoryStockoutShadowStabilityContract,
  InventoryStockoutShadowStabilityResponse,
  InventoryStockoutShadowStabilitySummary,
  MlShadowStabilityCatalogSummary,
  ShadowStabilityGateStatus,
} from "./datasetTypes";

const CONTRACT_KEY = "inventory_stockout_shadow_monitoring_stability_gate_v1" as const;
const CONTRACT_VERSION = "v1" as const;
const GATE_KEY = "inventory_stockout_shadow_stability_gate_v1" as const;
const EVALUATION_KEY = "inventory_stockout_shadow_evaluation_v1" as const;
const DEFAULT_MINIMUM_EVALUATIONS = 3;
const DEFAULT_LOOKBACK_EVALUATIONS = 5;
const MIN_AVG_DELTA_F1_PCT = 0;
const MIN_AVG_DELTA_BALANCED_ACCURACY_PCT = 0;

const asNumber = (value: unknown): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const normalizeText = (value: unknown, fallback = ""): string => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const clampInteger = (value: unknown, fallback: number, min: number, max: number): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, Math.round(numeric)));
};

const roundPct = (value: number | null): number | null => {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.round(value * 100) / 100;
};

const average = (values: Array<number | null>): number | null => {
  const numeric = values.filter((value): value is number => value != null && Number.isFinite(value));
  if (!numeric.length) return null;
  return roundPct(numeric.reduce((sum, value) => sum + value, 0) / numeric.length);
};

const buildContract = (): InventoryStockoutShadowStabilityContract => ({
  contractKey: CONTRACT_KEY,
  contractVersion: CONTRACT_VERSION,
  generatedAt: new Date().toISOString(),
  purpose: "Monitor repeated approved-candidate shadow evaluations and decide whether the candidate is stable enough for a later offline pilot gate without enabling inference.",
  acceptedEvaluationKey: EVALUATION_KEY,
  minimumEvaluations: DEFAULT_MINIMUM_EVALUATIONS,
  lookbackEvaluations: DEFAULT_LOOKBACK_EVALUATIONS,
  stabilityRules: [
    "Use only recorded shadow evaluations for approved external model candidates.",
    "Require at least three shadow evaluations for the same import/model before calling it stable.",
    "Every evaluation in the stability window must beat or match the Rule/Statistical Baseline on F1 and Balanced Accuracy.",
    "Blocked or underperforming shadow evaluations prevent stability promotion.",
    "A stable gate only permits discussion of a later offline pilot; it must not enable production inference or decision automation.",
  ],
  shadowOnlyPolicy: {
    productionIntegrationAllowed: false,
    inferenceRuntimeEnabled: false,
    decisionAutomationAllowed: false,
    canChangeInventoryOrAccounting: false,
  },
  forbiddenBehavior: [
    "Do not execute external model code inside Kourosh.",
    "Do not expose real-time inference or operational prediction endpoints for the external model.",
    "Do not modify inventory, purchasing, pricing, accounting, ledgers, invoices, or reports from shadow stability results.",
    "Do not promote to production from this gate; later phases must add separate review and rollback controls.",
  ],
});

const pickLatestImportId = async (): Promise<number | null> => {
  const imports = await listMlModelResultImports(50) as Array<Record<string, unknown>>;
  const candidate = imports.find((row) => {
    const status = normalizeText(row.status);
    return status === "validated" || status === "warning";
  }) || imports[0];
  return asNumber(candidate?.id);
};

const buildRecommendedNextAction = (
  status: ShadowStabilityGateStatus,
  blockers: string[],
  warnings: string[],
): string => {
  if (blockers.length) return blockers[0];
  if (status === "insufficient_history") return "حداقل سه shadow evaluation برای همین candidate ثبت کنید تا پایداری قابل قضاوت باشد.";
  if (status === "unstable") return "candidate را در shadow نگه دارید؛ تا وقتی تمام evaluationهای پنجره از baseline بهتر یا برابر نشوند وارد pilot gate نشود.";
  if (status === "watch") return warnings[0] || "چند evaluation دیگر ثبت کنید تا نوسان metricها مشخص شود.";
  if (status === "stable_candidate") return "candidate از نظر shadow history پایدار است؛ مرحله بعد فقط pilot gate آفلاین با rollback policy است، نه production inference.";
  return "shadow stability gate فعلاً آماده تصمیم نیست.";
};

const buildSummary = (
  evaluations: Array<Record<string, unknown>>,
  options: {
    generatedAt: string;
    importId: number | null;
    minimumEvaluations: number;
    lookbackEvaluations: number;
  },
): InventoryStockoutShadowStabilitySummary => {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const considered = evaluations.slice(0, options.lookbackEvaluations);
  const evaluationsConsidered = considered.length;
  const first = considered[0] || null;
  const modelKey = normalizeText(first?.modelKey, "") || null;
  const modelVersion = normalizeText(first?.modelVersion, "") || null;

  if (!options.importId) blockers.push("برای stability gate هیچ import معتبر پیدا نشد.");
  if (evaluationsConsidered < options.minimumEvaluations) {
    blockers.push(`برای stability gate حداقل ${options.minimumEvaluations} shadow evaluation لازم است.`);
  }

  const candidateAvgF1Pct = average(considered.map((row) => asNumber(row.candidateF1Pct)));
  const baselineAvgF1Pct = average(considered.map((row) => asNumber(row.baselineF1Pct)));
  const avgDeltaF1Pct = average(considered.map((row) => asNumber(row.deltaF1Pct)));
  const candidateAvgBalancedAccuracyPct = average(considered.map((row) => asNumber(row.candidateBalancedAccuracyPct)));
  const baselineAvgBalancedAccuracyPct = average(considered.map((row) => asNumber(row.baselineBalancedAccuracyPct)));
  const avgDeltaBalancedAccuracyPct = average(considered.map((row) => asNumber(row.deltaBalancedAccuracyPct)));

  const positiveDeltaF1Count = considered.filter((row) => (asNumber(row.deltaF1Pct) ?? -Infinity) >= 0).length;
  const positiveDeltaBalancedAccuracyCount = considered.filter((row) => (asNumber(row.deltaBalancedAccuracyPct) ?? -Infinity) >= 0).length;
  const underperformingCount = considered.filter((row) => normalizeText(row.status) === "underperforming").length;
  const blockedCount = considered.filter((row) => normalizeText(row.status) === "blocked" || normalizeText(row.status) === "insufficient_data").length;
  const readyCount = considered.filter((row) => normalizeText(row.status) === "ready").length;
  const watchCount = considered.filter((row) => normalizeText(row.status) === "watch").length;

  if (blockedCount > 0) blockers.push("در پنجره stability حداقل یک shadow evaluation مسدود یا فاقد داده کافی وجود دارد.");
  if (underperformingCount > 0) warnings.push("در پنجره stability حداقل یک shadow evaluation ضعیف‌تر از baseline بوده است.");
  if (avgDeltaF1Pct == null || avgDeltaBalancedAccuracyPct == null) {
    blockers.push("metricهای delta برای F1 یا Balanced Accuracy در پنجره stability کامل نیستند.");
  }
  if (avgDeltaF1Pct != null && avgDeltaF1Pct < MIN_AVG_DELTA_F1_PCT) {
    warnings.push("میانگین delta F1 در پنجره stability منفی است.");
  }
  if (avgDeltaBalancedAccuracyPct != null && avgDeltaBalancedAccuracyPct < MIN_AVG_DELTA_BALANCED_ACCURACY_PCT) {
    warnings.push("میانگین delta Balanced Accuracy در پنجره stability منفی است.");
  }
  if (positiveDeltaF1Count < evaluationsConsidered) {
    warnings.push("همه shadow evaluationهای پنجره روی F1 بهتر یا برابر baseline نیستند.");
  }
  if (positiveDeltaBalancedAccuracyCount < evaluationsConsidered) {
    warnings.push("همه shadow evaluationهای پنجره روی Balanced Accuracy بهتر یا برابر baseline نیستند.");
  }

  let status: ShadowStabilityGateStatus = "stable_candidate";
  if (blockers.length) status = evaluationsConsidered < options.minimumEvaluations ? "insufficient_history" : "blocked";
  else if (underperformingCount > 0 || (avgDeltaF1Pct ?? 0) < 0 || (avgDeltaBalancedAccuracyPct ?? 0) < 0) status = "unstable";
  else if (warnings.length || watchCount > 0) status = "watch";

  const stableEnoughForOfflinePilot = status === "stable_candidate";

  return {
    gateKey: GATE_KEY,
    generatedAt: options.generatedAt,
    importId: options.importId,
    modelKey,
    modelVersion,
    evaluationsConsidered,
    minimumEvaluations: options.minimumEvaluations,
    candidateAvgF1Pct,
    baselineAvgF1Pct,
    avgDeltaF1Pct,
    candidateAvgBalancedAccuracyPct,
    baselineAvgBalancedAccuracyPct,
    avgDeltaBalancedAccuracyPct,
    positiveDeltaF1Count,
    positiveDeltaBalancedAccuracyCount,
    underperformingCount,
    blockedCount,
    readyCount,
    watchCount,
    status,
    stableEnoughForOfflinePilot,
    productionIntegrationAllowed: false,
    inferenceRuntimeEnabled: false,
    decisionAutomationAllowed: false,
    blockers,
    warnings,
    recommendedNextAction: buildRecommendedNextAction(status, blockers, warnings),
  };
};

const buildResponse = async (
  importIdInput?: unknown,
  shouldRecord = false,
  userId?: number | null,
  options: Record<string, unknown> = {},
): Promise<InventoryStockoutShadowStabilityResponse> => {
  const generatedAt = new Date().toISOString();
  const contract = buildContract();
  const requestedImportId = asNumber(importIdInput);
  const importId = requestedImportId || await pickLatestImportId();
  const minimumEvaluations = clampInteger(options.minimumEvaluations, DEFAULT_MINIMUM_EVALUATIONS, 2, 10);
  const lookbackEvaluations = clampInteger(options.lookbackEvaluations, DEFAULT_LOOKBACK_EVALUATIONS, minimumEvaluations, 20);
  const evaluations = importId ? await listMlShadowEvaluationsByImportId(importId, lookbackEvaluations) as Array<Record<string, unknown>> : [];
  const summary = buildSummary(evaluations, { generatedAt, importId, minimumEvaluations, lookbackEvaluations });
  let stabilityRecord: Record<string, unknown> | null = null;

  if (shouldRecord) {
    stabilityRecord = await recordMlShadowStabilityCheck({
      gateKey: GATE_KEY,
      importId,
      modelKey: summary.modelKey,
      modelVersion: summary.modelVersion,
      minimumEvaluations: summary.minimumEvaluations,
      lookbackEvaluations,
      evaluationsConsidered: summary.evaluationsConsidered,
      candidateAvgF1Pct: summary.candidateAvgF1Pct,
      baselineAvgF1Pct: summary.baselineAvgF1Pct,
      avgDeltaF1Pct: summary.avgDeltaF1Pct,
      candidateAvgBalancedAccuracyPct: summary.candidateAvgBalancedAccuracyPct,
      baselineAvgBalancedAccuracyPct: summary.baselineAvgBalancedAccuracyPct,
      avgDeltaBalancedAccuracyPct: summary.avgDeltaBalancedAccuracyPct,
      positiveDeltaF1Count: summary.positiveDeltaF1Count,
      positiveDeltaBalancedAccuracyCount: summary.positiveDeltaBalancedAccuracyCount,
      underperformingCount: summary.underperformingCount,
      blockedCount: summary.blockedCount,
      readyCount: summary.readyCount,
      watchCount: summary.watchCount,
      status: summary.status,
      stableEnoughForOfflinePilot: summary.stableEnoughForOfflinePilot,
      summary,
      policy: contract,
      userId: userId || null,
    }) as Record<string, unknown> | null;
  }

  return {
    generatedAt,
    contract,
    summary,
    evaluations,
    operationalPolicy: {
      shadowOnly: true,
      productionIntegrationAllowed: false,
      inferenceRuntimeEnabled: false,
      decisionAutomationAllowed: false,
      message: "stability gate فقط تاریخچه shadow را بررسی می‌کند و هیچ تصمیم عملیاتی، خرید، موجودی، قیمت‌گذاری یا حسابداری را تغییر نمی‌دهد.",
    },
    stabilityRecord,
  };
};

export const buildInventoryStockoutShadowStabilityContract = buildContract;

export const buildInventoryStockoutShadowStabilityGate = async (
  importIdInput?: unknown,
  options: Record<string, unknown> = {},
): Promise<InventoryStockoutShadowStabilityResponse> => buildResponse(importIdInput, false, null, options);

export const recordInventoryStockoutShadowStabilityGate = async (request: {
  importId?: unknown;
  userId?: number | null;
  minimumEvaluations?: unknown;
  lookbackEvaluations?: unknown;
} = {}): Promise<InventoryStockoutShadowStabilityResponse> => buildResponse(
  request.importId,
  true,
  request.userId || null,
  request as Record<string, unknown>,
);

export const buildMlShadowStabilityCatalogSummary = async (): Promise<MlShadowStabilityCatalogSummary> => {
  const generatedAt = new Date().toISOString();
  const current = await buildInventoryStockoutShadowStabilityGate();
  const lastStabilityChecks = await listMlShadowStabilityChecks(10) as Array<Record<string, unknown>>;
  const recentShadowEvaluations = await listMlShadowEvaluations(5) as Array<Record<string, unknown>>;
  return {
    generatedAt,
    contract: current.contract,
    currentStabilityGate: current.summary,
    lastStabilityChecks,
    recommendedNextAction: current.summary.recommendedNextAction || (recentShadowEvaluations.length ? "shadow history را کامل کنید." : "ابتدا shadow evaluation ثبت کنید."),
  };
};
