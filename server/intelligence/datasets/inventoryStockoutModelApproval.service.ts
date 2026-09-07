import {
  getMlModelResultImportById,
  listMlModelApprovalReviews,
  listMlModelApprovalReviewsByImportId,
  listMlModelResultImports,
  recordMlModelApprovalReview,
} from "../../db/domains/mlDatasets.db";
import type {
  ExternalModelApprovalDecision,
  ExternalModelApprovalGateCheck,
  ExternalModelApprovalPolicyContract,
  ExternalModelApprovalPolicyGate,
  ExternalModelApprovalReviewRequest,
  ExternalModelApprovalReviewResponse,
  ExternalModelApprovalStatus,
  MlModelApprovalCatalogSummary,
} from "./datasetTypes";

const CONTRACT_KEY = "inventory_stockout_external_model_approval_workflow_v1" as const;
const CONTRACT_VERSION = "v1" as const;
const GATE_KEY = "inventory_stockout_external_model_approval_gate_v1" as const;
const DATASET_KEY = "inventory_stockout_baseline_v1" as const;
const PACKAGE_KEY = "inventory_stockout_external_training_package_v1" as const;
const APPROVAL_SCOPE = "offline_candidate_review_only" as const;

const asNumber = (value: unknown): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const asBoolean = (value: unknown): boolean => value === true || value === 1 || value === "1" || value === "true";

const normalizeText = (value: unknown, fallback = ""): string => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const hasMetric = (value: unknown): boolean => {
  const numeric = Number(value);
  return Number.isFinite(numeric);
};

const pushCheck = (
  checks: ExternalModelApprovalGateCheck[],
  check: ExternalModelApprovalGateCheck,
): void => {
  checks.push(check);
};

export const buildInventoryStockoutModelApprovalContract = (): ExternalModelApprovalPolicyContract => ({
  contractKey: CONTRACT_KEY,
  contractVersion: CONTRACT_VERSION,
  generatedAt: new Date().toISOString(),
  purpose: "Review and approve or reject externally imported inventory stockout model results as offline candidates only, before any production integration is considered.",
  acceptedDatasetKey: DATASET_KEY,
  acceptedPackageKey: PACKAGE_KEY,
  allowedDecisions: ["approved_candidate", "rejected", "needs_changes"],
  approvalScope: APPROVAL_SCOPE,
  policyChecks: [
    "The model result import must exist in ml_model_result_imports.",
    "The import status must be validated or warning, never rejected or insufficient_data.",
    "All expected test split rows must be matched with no missing, unexpected, or duplicate row keys.",
    "F1 and balanced accuracy must be measurable on labeled test rows.",
    "The external result should beat or match the Rule/Statistical Baseline unless a manager records an explicit metric override.",
    "Approval creates only an offline candidate status; it must not enable inference or operational decisioning.",
  ],
  overrideRules: [
    "Metric override is allowed only when allowMetricOverride=true and a reason is supplied.",
    "Overrides are audit records, not production promotion.",
    "A blocked validation import cannot be approved with override.",
  ],
  forbiddenBehavior: [
    "Do not load executable model artifacts into Kourosh.",
    "Do not add Python, FastAPI, MLflow, model registry, or inference runtime.",
    "Do not change inventory, accounting, ledger, report, or pricing calculations based on the approved candidate.",
    "Do not call the approved candidate a production ML model.",
  ],
});

const buildGateFromImport = (
  importRecord: Record<string, unknown> | null,
): ExternalModelApprovalPolicyGate => {
  const generatedAt = new Date().toISOString();
  const checks: ExternalModelApprovalGateCheck[] = [];

  if (!importRecord) {
    return {
      gateKey: GATE_KEY,
      generatedAt,
      importId: null,
      modelKey: null,
      modelVersion: null,
      status: "block",
      canApprove: false,
      requiresMetricOverride: false,
      checks: [{
        key: "import_exists",
        label: "Import record exists",
        status: "block",
        value: null,
        message: "هیچ import معتبری برای review پیدا نشد.",
      }],
      blockers: ["هیچ نتیجه مدل بیرونی برای approval وجود ندارد."],
      warnings: [],
      recommendedDecision: "needs_changes",
      recommendedNextAction: "ابتدا خروجی مدل بیرونی را از contract فاز 2F import و validate کنید.",
    };
  }

  const importId = asNumber(importRecord.id);
  const modelKey = normalizeText(importRecord.modelKey, "unknown_external_model");
  const modelVersion = normalizeText(importRecord.modelVersion, "unknown_version");
  const importStatus = normalizeText(importRecord.status, "unknown");
  const matchedTestRows = asNumber(importRecord.matchedTestRows) ?? 0;
  const missingTestRows = asNumber(importRecord.missingTestRows) ?? 0;
  const unexpectedRows = asNumber(importRecord.unexpectedRows) ?? 0;
  const duplicateRows = asNumber(importRecord.duplicateRows) ?? 0;
  const f1Pct = asNumber(importRecord.f1Pct);
  const balancedAccuracyPct = asNumber(importRecord.balancedAccuracyPct);
  const baselineF1Pct = asNumber(importRecord.baselineF1Pct);
  const baselineBalancedAccuracyPct = asNumber(importRecord.baselineBalancedAccuracyPct);

  const statusOk = importStatus === "validated" || importStatus === "warning";
  pushCheck(checks, {
    key: "import_status_allowed",
    label: "Import validation status",
    status: statusOk ? importStatus === "warning" ? "warning" : "pass" : "block",
    value: importStatus,
    message: statusOk
      ? "وضعیت import برای review مدیریتی قابل قبول است."
      : "فقط import با وضعیت validated یا warning قابل review برای candidate approval است.",
  });

  const rowCoverageOk = matchedTestRows > 0 && missingTestRows === 0 && unexpectedRows === 0 && duplicateRows === 0;
  pushCheck(checks, {
    key: "test_split_row_coverage",
    label: "Test split row coverage",
    status: rowCoverageOk ? "pass" : "block",
    value: { matchedTestRows, missingTestRows, unexpectedRows, duplicateRows },
    message: rowCoverageOk
      ? "تمام rowKeyهای test split بدون مورد تکراری یا خارج از split پوشش داده شده‌اند."
      : "پوشش test split کامل نیست یا prediction تکراری/خارج از split وجود دارد.",
  });

  const metricsOk = hasMetric(f1Pct) && hasMetric(balancedAccuracyPct);
  pushCheck(checks, {
    key: "metrics_available",
    label: "External model metrics available",
    status: metricsOk ? "pass" : "block",
    value: { f1Pct, balancedAccuracyPct },
    message: metricsOk
      ? "F1 و Balanced Accuracy روی test split قابل محاسبه هستند."
      : "F1 یا Balanced Accuracy قابل محاسبه نیست؛ approval منطقی نیست.",
  });

  const baselineComparable = hasMetric(baselineF1Pct) && hasMetric(baselineBalancedAccuracyPct);
  const beatsOrMatchesBaseline = baselineComparable
    && (f1Pct ?? -Infinity) >= (baselineF1Pct ?? Infinity)
    && (balancedAccuracyPct ?? -Infinity) >= (baselineBalancedAccuracyPct ?? Infinity);
  pushCheck(checks, {
    key: "baseline_comparison",
    label: "Baseline comparison",
    status: !baselineComparable ? "warning" : beatsOrMatchesBaseline ? "pass" : "warning",
    value: { f1Pct, baselineF1Pct, balancedAccuracyPct, baselineBalancedAccuracyPct },
    message: !baselineComparable
      ? "benchmark baseline کافی نیست؛ approval فقط با احتیاط و audit قابل ثبت است."
      : beatsOrMatchesBaseline
        ? "external result از Rule/Statistical Baseline بهتر یا برابر است."
        : "external result از baseline بهتر نیست؛ برای approval باید override مدیریتی ثبت شود.",
  });

  const scopeOk = true;
  pushCheck(checks, {
    key: "offline_candidate_scope",
    label: "Approval scope",
    status: scopeOk ? "pass" : "block",
    value: APPROVAL_SCOPE,
    message: "approval فقط candidate آفلاین می‌سازد و inference/production decision را فعال نمی‌کند.",
  });

  const blockers = checks.filter((check) => check.status === "block").map((check) => check.message);
  const warnings = checks.filter((check) => check.status === "warning").map((check) => check.message);
  const requiresMetricOverride = warnings.length > 0 && !blockers.length;
  const status: ExternalModelApprovalPolicyGate["status"] = blockers.length ? "block" : warnings.length ? "warning" : "pass";

  return {
    gateKey: GATE_KEY,
    generatedAt,
    importId,
    modelKey,
    modelVersion,
    status,
    canApprove: !blockers.length,
    requiresMetricOverride,
    checks,
    blockers,
    warnings,
    recommendedDecision: blockers.length ? "needs_changes" : "approved_candidate",
    recommendedNextAction: blockers.length
      ? blockers[0]
      : requiresMetricOverride
        ? "برای approval، دلیل override مدیریتی را ثبت کنید یا خروجی مدل را بهتر از baseline کنید."
        : "مدل بیرونی می‌تواند فقط به‌عنوان offline candidate تأیید شود.",
  };
};

export const buildInventoryStockoutModelApprovalGate = async (
  importIdInput?: unknown,
): Promise<ExternalModelApprovalPolicyGate> => {
  const importId = asNumber(importIdInput);
  const importRecord = importId
    ? await getMlModelResultImportById(importId)
    : (await listMlModelResultImports(1))[0] || null;
  return buildGateFromImport((importRecord || null) as Record<string, unknown> | null);
};

const normalizeDecision = (value: unknown): ExternalModelApprovalDecision => {
  const decision = normalizeText(value);
  if (decision === "approved_candidate" || decision === "rejected" || decision === "needs_changes") {
    return decision;
  }
  return "needs_changes";
};

const resolvePromotionStage = (
  decision: ExternalModelApprovalDecision,
  gate: ExternalModelApprovalPolicyGate,
  allowMetricOverride: boolean,
  reason: string,
): ExternalModelApprovalStatus => {
  if (decision === "rejected") return "rejected";
  if (decision === "needs_changes") return "needs_changes";
  if (!gate.canApprove) return "blocked";
  if (gate.requiresMetricOverride && (!allowMetricOverride || !reason)) return "blocked";
  return "approved_candidate";
};

export const reviewInventoryStockoutExternalModelCandidate = async (
  request: ExternalModelApprovalReviewRequest = {},
): Promise<ExternalModelApprovalReviewResponse> => {
  const generatedAt = new Date().toISOString();
  const contract = buildInventoryStockoutModelApprovalContract();
  const importId = asNumber(request.importId);
  const importRecord = importId ? await getMlModelResultImportById(importId) : null;
  const gate = buildGateFromImport((importRecord || null) as Record<string, unknown> | null);
  const decision = normalizeDecision(request.decision);
  const reason = normalizeText(request.reason);
  const reviewerNotes = normalizeText(request.reviewerNotes);
  const allowMetricOverride = asBoolean(request.allowMetricOverride);
  const promotionStage = resolvePromotionStage(decision, gate, allowMetricOverride, reason);

  const reviewPayload = {
    decision,
    approvalStatus: promotionStage,
    promotionStage,
    approvalScope: APPROVAL_SCOPE,
    reason,
    reviewerNotes,
    allowMetricOverride,
    requestedPromotionStage: request.requestedPromotionStage || "candidate",
    productionIntegrationAllowed: false,
    inferenceRuntimeEnabled: false,
  };

  let review: Record<string, unknown> | null = null;
  if (importRecord && gate.importId) {
    review = await recordMlModelApprovalReview({
      importId: gate.importId,
      reviewKey: `${CONTRACT_KEY}:${gate.importId}:${decision}:${generatedAt}`,
      modelKey: gate.modelKey || "unknown_external_model",
      modelVersion: gate.modelVersion || "unknown_version",
      decision,
      approvalStatus: promotionStage,
      promotionStage,
      approvalScope: APPROVAL_SCOPE,
      reason: reason || null,
      reviewerNotes: reviewerNotes || null,
      metricOverride: allowMetricOverride,
      policy: contract,
      gate,
      review: reviewPayload,
      userId: request.userId || null,
    }) as Record<string, unknown> | null;
  }

  return {
    generatedAt,
    contract,
    gate,
    review,
    operationalPolicy: {
      productionIntegrationAllowed: false,
      inferenceRuntimeEnabled: false,
      promotionStage,
      message: promotionStage === "approved_candidate"
        ? "مدل فقط به‌عنوان offline candidate تأیید شد؛ inference و تصمیم عملیاتی فعال نیست."
        : promotionStage === "blocked"
          ? "درخواست approval با policy gate مسدود شد و production integration مجاز نیست."
          : "تصمیم مدیریتی ثبت شد؛ هیچ تغییر عملیاتی در سیستم اعمال نشد.",
    },
  };
};

export const buildMlModelApprovalCatalogSummary = async (): Promise<MlModelApprovalCatalogSummary> => {
  const generatedAt = new Date().toISOString();
  const [lastApprovalReviews, lastModelImports] = await Promise.all([
    listMlModelApprovalReviews(10),
    listMlModelResultImports(20),
  ]);
  const currentImport = (lastModelImports[0] || null) as Record<string, unknown> | null;
  const currentGate = buildGateFromImport(currentImport);
  const lastApprovedCandidate = (lastApprovalReviews as Array<Record<string, unknown>>).find(
    (review) => review.approvalStatus === "approved_candidate",
  ) || null;
  const reviewedImportIds = new Set((lastApprovalReviews as Array<Record<string, unknown>>).map((review) => Number(review.importId)));
  const pendingReviewCount = (lastModelImports as Array<Record<string, unknown>>).filter((record) => {
    const id = Number(record.id);
    const status = normalizeText(record.status);
    return id > 0 && !reviewedImportIds.has(id) && (status === "validated" || status === "warning");
  }).length;

  return {
    generatedAt,
    contract: buildInventoryStockoutModelApprovalContract(),
    currentGate,
    lastApprovedCandidate,
    pendingReviewCount,
    lastApprovalReviews: lastApprovalReviews as Array<Record<string, unknown>>,
    recommendedNextAction: currentGate.recommendedNextAction,
  };
};

export const listInventoryStockoutExternalModelApprovalReviews = async (importIdInput: unknown) => {
  return listMlModelApprovalReviewsByImportId(importIdInput, 20);
};
