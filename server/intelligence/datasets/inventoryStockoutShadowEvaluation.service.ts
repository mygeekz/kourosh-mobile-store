import {
  getMlModelResultImportById,
  listMlModelApprovalReviews,
  listMlModelApprovalReviewsByImportId,
  listMlShadowEvaluations,
  recordMlShadowEvaluation,
} from "../../db/domains/mlDatasets.db";
import type {
  InventoryStockoutShadowEvaluationContract,
  InventoryStockoutShadowEvaluationResponse,
  InventoryStockoutShadowEvaluationSummary,
  MlShadowEvaluationCatalogSummary,
  ShadowEvaluationStatus,
} from "./datasetTypes";

const CONTRACT_KEY = "inventory_stockout_approved_candidate_shadow_evaluation_v1" as const;
const CONTRACT_VERSION = "v1" as const;
const EVALUATION_KEY = "inventory_stockout_shadow_evaluation_v1" as const;
const DATASET_KEY = "inventory_stockout_baseline_v1" as const;
const DATASET_VERSION = "v1" as const;
const PACKAGE_KEY = "inventory_stockout_external_training_package_v1" as const;
const PACKAGE_VERSION = "v1" as const;
const APPROVAL_SCOPE = "offline_candidate_review_only" as const;

const asNumber = (value: unknown): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const normalizeText = (value: unknown, fallback = ""): string => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const roundPct = (value: number | null): number | null => {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.round(value * 100) / 100;
};

const delta = (candidate: number | null, baseline: number | null): number | null => {
  if (candidate == null || baseline == null) return null;
  return roundPct(candidate - baseline);
};

const isApprovedCandidate = (review: Record<string, unknown>): boolean => (
  normalizeText(review.approvalStatus) === "approved_candidate"
  || normalizeText(review.promotionStage) === "approved_candidate"
  || normalizeText(review.decision) === "approved_candidate"
);

const buildContract = (): InventoryStockoutShadowEvaluationContract => ({
  contractKey: CONTRACT_KEY,
  contractVersion: CONTRACT_VERSION,
  generatedAt: new Date().toISOString(),
  purpose: "Evaluate approved external inventory stockout candidates in shadow mode against the Rule/Statistical Baseline without enabling production inference.",
  acceptedDatasetKey: DATASET_KEY,
  acceptedPackageKey: PACKAGE_KEY,
  acceptedApprovalScope: APPROVAL_SCOPE,
  shadowMode: {
    enabled: true,
    productionIntegrationAllowed: false,
    inferenceRuntimeEnabled: false,
    canChangeInventoryOrAccounting: false,
  },
  evaluationRules: [
    "Only externally imported results with an approved_candidate review are eligible for shadow evaluation.",
    "Shadow evaluation replays the approved import metrics on the fixed test split and compares them with the Rule/Statistical Baseline.",
    "Shadow status is advisory and audit-only; it must not trigger inventory, accounting, purchasing, pricing, or customer actions.",
    "A candidate must continue beating or matching the baseline on F1 and Balanced Accuracy before any later pilot discussion.",
    "This phase records shadow evaluation history but does not add a model registry or inference runtime.",
  ],
  forbiddenBehavior: [
    "Do not execute external model binaries or Python code inside Kourosh.",
    "Do not expose a production prediction endpoint for the external model.",
    "Do not change official inventory, accounting, ledger, reports, invoices, or pricing calculations.",
    "Do not auto-promote shadow candidates into production decisions.",
  ],
});

const findApprovedReviewForImport = async (importId: number | null): Promise<Record<string, unknown> | null> => {
  if (importId && importId > 0) {
    const reviews = await listMlModelApprovalReviewsByImportId(importId, 20) as Array<Record<string, unknown>>;
    return reviews.find(isApprovedCandidate) || null;
  }
  const reviews = await listMlModelApprovalReviews(100) as Array<Record<string, unknown>>;
  return reviews.find(isApprovedCandidate) || null;
};

const buildRecommendedNextAction = (
  status: ShadowEvaluationStatus,
  warnings: string[],
  blockers: string[],
): string => {
  if (blockers.length) return blockers[0];
  if (status === "insufficient_data") return "برای shadow evaluation به import معتبر، approval candidate و benchmark قابل مقایسه نیاز است.";
  if (status === "underperforming") return "candidate را در حالت shadow نگه دارید و قبل از pilot، training یا threshold را بیرون از Kourosh اصلاح کنید.";
  if (status === "watch") return warnings[0] || "shadow evaluation را تکرار کنید تا پایداری برتری نسبت به baseline مشخص شود.";
  return "candidate فقط در shadow mode قابل ادامه است؛ برای فاز بعدی می‌توانید pilot gate آفلاین تعریف کنید، نه inference production.";
};

const buildResponseFromImport = async (
  importRecord: Record<string, unknown> | null,
  approvedReview: Record<string, unknown> | null,
  shouldRecord: boolean,
  userId?: number | null,
): Promise<InventoryStockoutShadowEvaluationResponse> => {
  const generatedAt = new Date().toISOString();
  const contract = buildContract();
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!importRecord) {
    blockers.push("برای shadow evaluation هیچ import record معتبری پیدا نشد.");
  }
  if (!approvedReview) {
    blockers.push("هیچ approval review با وضعیت approved_candidate برای این مدل وجود ندارد.");
  }

  const importId = asNumber(importRecord?.id);
  const approvalReviewId = asNumber(approvedReview?.id);
  const modelKey = normalizeText(importRecord?.modelKey || approvedReview?.modelKey, "") || null;
  const modelVersion = normalizeText(importRecord?.modelVersion || approvedReview?.modelVersion, "") || null;
  const importStatus = normalizeText(importRecord?.status);
  const evaluatedRows = asNumber(importRecord?.matchedTestRows) ?? 0;
  const missingRows = asNumber(importRecord?.missingTestRows) ?? 0;
  const unexpectedRows = asNumber(importRecord?.unexpectedRows) ?? 0;
  const duplicateRows = asNumber(importRecord?.duplicateRows) ?? 0;
  const candidateF1Pct = asNumber(importRecord?.f1Pct);
  const baselineF1Pct = asNumber(importRecord?.baselineF1Pct);
  const candidateBalancedAccuracyPct = asNumber(importRecord?.balancedAccuracyPct);
  const baselineBalancedAccuracyPct = asNumber(importRecord?.baselineBalancedAccuracyPct);
  const deltaF1Pct = delta(candidateF1Pct, baselineF1Pct);
  const deltaBalancedAccuracyPct = delta(candidateBalancedAccuracyPct, baselineBalancedAccuracyPct);

  if (importRecord && importStatus !== "validated" && importStatus !== "warning") {
    blockers.push("فقط import با وضعیت validated یا warning برای shadow evaluation قابل قبول است.");
  }
  if (importRecord && (evaluatedRows <= 0 || missingRows > 0 || unexpectedRows > 0 || duplicateRows > 0)) {
    blockers.push("پوشش test split برای shadow evaluation کامل نیست یا rowKey تکراری/خارج از split وجود دارد.");
  }
  if (candidateF1Pct == null || candidateBalancedAccuracyPct == null) {
    blockers.push("metricهای candidate برای shadow evaluation کامل نیستند.");
  }
  if (baselineF1Pct == null || baselineBalancedAccuracyPct == null) {
    warnings.push("metricهای baseline کامل نیستند؛ shadow فقط به‌صورت watch ثبت می‌شود.");
  }
  if (deltaF1Pct != null && deltaF1Pct < 0) {
    warnings.push("candidate از نظر F1 ضعیف‌تر از Rule/Statistical Baseline است.");
  }
  if (deltaBalancedAccuracyPct != null && deltaBalancedAccuracyPct < 0) {
    warnings.push("candidate از نظر Balanced Accuracy ضعیف‌تر از Rule/Statistical Baseline است.");
  }

  let status: ShadowEvaluationStatus = "ready";
  if (blockers.length) status = importRecord ? "blocked" : "insufficient_data";
  else if (deltaF1Pct == null || deltaBalancedAccuracyPct == null) status = "watch";
  else if (deltaF1Pct < 0 || deltaBalancedAccuracyPct < 0) status = "underperforming";
  else if (warnings.length) status = "watch";

  const summary: InventoryStockoutShadowEvaluationSummary = {
    evaluationKey: EVALUATION_KEY,
    generatedAt,
    importId: importId || null,
    approvalReviewId: approvalReviewId || null,
    modelKey,
    modelVersion,
    evaluatedOn: "approved_import_test_split_replay",
    shadowModeEnabled: true,
    productionIntegrationAllowed: false,
    inferenceRuntimeEnabled: false,
    evaluatedRows,
    candidateF1Pct,
    baselineF1Pct,
    deltaF1Pct,
    candidateBalancedAccuracyPct,
    baselineBalancedAccuracyPct,
    deltaBalancedAccuracyPct,
    status,
    blockers,
    warnings,
    recommendedNextAction: buildRecommendedNextAction(status, warnings, blockers),
  };

  const beatsBaselineOnF1 = deltaF1Pct == null ? null : deltaF1Pct >= 0;
  const beatsBaselineOnBalancedAccuracy = deltaBalancedAccuracyPct == null ? null : deltaBalancedAccuracyPct >= 0;
  let evaluationRecord: Record<string, unknown> | null = null;

  if (shouldRecord && importRecord && importId && modelKey && modelVersion) {
    evaluationRecord = await recordMlShadowEvaluation({
      evaluationKey: EVALUATION_KEY,
      importId,
      approvalReviewId: approvalReviewId || null,
      modelKey,
      modelVersion,
      datasetKey: normalizeText(importRecord.datasetKey, DATASET_KEY),
      datasetVersion: normalizeText(importRecord.datasetVersion, DATASET_VERSION),
      packageKey: normalizeText(importRecord.packageKey, PACKAGE_KEY),
      packageVersion: normalizeText(importRecord.packageVersion, PACKAGE_VERSION),
      splitKey: normalizeText(importRecord.splitKey, "inventory_stockout_default_split"),
      splitStrategy: normalizeText(importRecord.splitStrategy, "entity_grouped_hash"),
      seed: normalizeText(importRecord.seed, "kourosh-inventory-stockout-v1"),
      testRatio: asNumber(importRecord.testRatio) ?? 0.2,
      evaluatedRows,
      candidateF1Pct,
      baselineF1Pct,
      deltaF1Pct,
      candidateBalancedAccuracyPct,
      baselineBalancedAccuracyPct,
      deltaBalancedAccuracyPct,
      status,
      summary,
      policy: contract,
      userId: userId || null,
    }) as Record<string, unknown> | null;
  }

  return {
    generatedAt,
    contract,
    summary,
    approvedCandidate: approvedReview,
    sourceImport: importRecord,
    metricsComparison: {
      beatsBaselineOnF1,
      beatsBaselineOnBalancedAccuracy,
      stableEnoughForPilot: false,
      explanation: "Phase 2H فقط shadow/audit است؛ حتی candidate آماده نیز pilot یا production inference را فعال نمی‌کند.",
    },
    operationalPolicy: {
      shadowOnly: true,
      productionIntegrationAllowed: false,
      inferenceRuntimeEnabled: false,
      decisionAutomationAllowed: false,
      message: "نتیجه shadow فقط برای مقایسه و audit است و روی خرید، موجودی، قیمت‌گذاری، گزارشات یا حسابداری اثر نمی‌گذارد.",
    },
    evaluationRecord,
  };
};

export const buildInventoryStockoutShadowEvaluationContract = buildContract;

export const buildInventoryStockoutShadowEvaluation = async (
  importIdInput?: unknown,
  shouldRecord = false,
  userId?: number | null,
): Promise<InventoryStockoutShadowEvaluationResponse> => {
  const requestedImportId = asNumber(importIdInput);
  const approvedReview = await findApprovedReviewForImport(requestedImportId);
  const resolvedImportId = requestedImportId || asNumber(approvedReview?.importId);
  const importRecord = resolvedImportId ? await getMlModelResultImportById(resolvedImportId) as Record<string, unknown> | null : null;
  return buildResponseFromImport(importRecord, approvedReview, shouldRecord, userId);
};

export const recordInventoryStockoutShadowEvaluation = async (request: {
  importId?: unknown;
  userId?: number | null;
} = {}): Promise<InventoryStockoutShadowEvaluationResponse> => {
  return buildInventoryStockoutShadowEvaluation(request.importId, true, request.userId || null);
};

export const buildMlShadowEvaluationCatalogSummary = async (): Promise<MlShadowEvaluationCatalogSummary> => {
  const generatedAt = new Date().toISOString();
  const current = await buildInventoryStockoutShadowEvaluation();
  const lastShadowEvaluations = await listMlShadowEvaluations(10) as Array<Record<string, unknown>>;
  return {
    generatedAt,
    contract: buildContract(),
    currentShadowEvaluation: current.summary,
    lastShadowEvaluations,
    recommendedNextAction: current.summary.recommendedNextAction,
  };
};
