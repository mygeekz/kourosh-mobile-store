import {
  listMlOfflinePilotReadinessChecks,
  listMlShadowStabilityChecks,
  listMlShadowStabilityChecksByImportId,
  recordMlOfflinePilotReadinessCheck,
} from "../../db/domains/mlDatasets.db";
import type {
  InventoryStockoutOfflinePilotReadinessCheck,
  InventoryStockoutOfflinePilotReadinessContract,
  InventoryStockoutOfflinePilotReadinessResponse,
  InventoryStockoutOfflinePilotReadinessSummary,
  MlOfflinePilotReadinessCatalogSummary,
  OfflinePilotReadinessStatus,
} from "./datasetTypes";

const CONTRACT_KEY = "inventory_stockout_offline_pilot_readiness_gate_v1" as const;
const CONTRACT_VERSION = "v1" as const;
const ACCEPTED_STABILITY_GATE_KEY = "inventory_stockout_shadow_stability_gate_v1" as const;
const ACCEPTED_STABILITY_STATUS = "stable_candidate" as const;
const DEFAULT_MONITORING_CADENCE = "offline_daily_review";

const asNumber = (value: unknown): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const asInteger = (value: unknown): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.round(numeric) : 0;
};

const asBoolean = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  const text = String(value ?? "").trim().toLowerCase();
  return ["1", "true", "yes", "approved", "owner_approved"].includes(text);
};

const normalizeText = (value: unknown, fallback: string | null = null): string | null => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const roundPct = (value: number | null): number | null => {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.round(value * 100) / 100;
};

const buildContract = (): InventoryStockoutOfflinePilotReadinessContract => ({
  contractKey: CONTRACT_KEY,
  contractVersion: CONTRACT_VERSION,
  generatedAt: new Date().toISOString(),
  purpose: "Define the offline pilot readiness gate, owner approval requirement, rollback policy, and monitoring checklist for a stable approved external stockout candidate without enabling production inference.",
  acceptedStabilityGateKey: ACCEPTED_STABILITY_GATE_KEY,
  acceptedStabilityStatus: ACCEPTED_STABILITY_STATUS,
  pilotScope: "offline_pilot_readiness_only",
  readinessRules: [
    "Use only a recorded Shadow Stability Gate result for the same import/model.",
    "Require status stable_candidate and stableEnoughForOfflinePilot=true before any offline pilot readiness can pass.",
    "Require explicit owner approval with a named pilot owner before recording pilot_ready.",
    "Require a rollback owner and rollback triggers before recording pilot_ready.",
    "The offline pilot may compare recommendations outside production, but it must not change inventory, pricing, accounting, reports, or customer-facing decisions.",
  ],
  requiredOwnerApproval: true,
  requiredRollbackPolicy: [
    "Rollback if the candidate falls below the Rule/Statistical Baseline on F1 or Balanced Accuracy.",
    "Rollback if row coverage becomes incomplete, missing, duplicated, or unexpected.",
    "Rollback if any data leakage or label integrity issue is found.",
    "Rollback immediately when the pilot owner, rollback owner, Admin, or Manager requests it.",
  ],
  monitoringChecklist: [
    "Record pilot checks as audit-only events.",
    "Compare candidate metrics with the Rule/Statistical Baseline every review cycle.",
    "Review blockers and warnings before every pilot continuation decision.",
    "Keep productionIntegrationAllowed=false and inferenceRuntimeEnabled=false.",
    "Document rollback owner, pilot owner, and manual rollback reason.",
  ],
  forbiddenBehavior: [
    "Do not run external model code inside Kourosh.",
    "Do not expose live inference endpoints.",
    "Do not auto-create purchase orders, inventory movements, pricing changes, ledger entries, invoices, reports, or customer messages from the candidate.",
    "Do not call the candidate a production ML model.",
  ],
  operationalPolicy: {
    productionIntegrationAllowed: false,
    inferenceRuntimeEnabled: false,
    decisionAutomationAllowed: false,
    canChangeInventoryOrAccounting: false,
  },
});

const buildRollbackPolicy = (rollbackOwner: string | null) => ({
  rollbackRequiredWhen: [
    "candidate_delta_f1_pct < 0",
    "candidate_delta_balanced_accuracy_pct < 0",
    "shadow_or_stability_status IN ('blocked', 'underperforming', 'unstable')",
    "missing_test_rows > 0 OR unexpected_rows > 0 OR duplicate_rows > 0",
    "data_leakage_or_label_integrity_issue_detected",
    "manual_rollback_requested_by_owner_admin_or_manager",
  ],
  rollbackAction: "Stop the offline pilot review, keep the Rule/Statistical Baseline as the only active reference, record the rollback reason, and require a new import + approval cycle before retrying.",
  rollbackOwner,
  postRollbackReview: "Review the failed period, data quality issues, threshold assumptions, and baseline comparison before any new offline pilot readiness request.",
});

const buildMonitoringPlan = (cadence: string) => ({
  cadence,
  checklist: [
    "Verify the latest stability gate remains stable_candidate.",
    "Confirm F1 and Balanced Accuracy stay equal to or better than baseline.",
    "Confirm no inventory, accounting, pricing, report, or customer action used candidate output automatically.",
    "Confirm owner approval and rollback owner are still valid.",
    "Record every continuation, pause, or rollback decision as audit-only metadata.",
  ],
  stopConditions: [
    "stability gate becomes unstable, blocked, or insufficient_history",
    "candidate falls below baseline on F1 or Balanced Accuracy",
    "owner approval is revoked or ownership is unclear",
    "rollback owner is missing",
    "any request attempts to enable production inference or decision automation",
  ],
});

const pickLatestStabilityCheck = async (importIdInput?: unknown): Promise<Record<string, unknown> | null> => {
  const importId = asNumber(importIdInput);
  const rows = importId
    ? await listMlShadowStabilityChecksByImportId(importId, 1) as Array<Record<string, unknown>>
    : await listMlShadowStabilityChecks(1) as Array<Record<string, unknown>>;
  return rows[0] || null;
};

const buildChecks = (args: {
  stabilityCheck: Record<string, unknown> | null;
  ownerApproved: boolean;
  ownerName: string | null;
  pilotOwner: string | null;
  rollbackOwner: string | null;
}): InventoryStockoutOfflinePilotReadinessCheck[] => {
  const stableEnough = args.stabilityCheck?.status === ACCEPTED_STABILITY_STATUS && asBoolean(args.stabilityCheck?.stableEnoughForOfflinePilot);
  const evaluationsConsidered = asInteger(args.stabilityCheck?.evaluationsConsidered);
  const minimumEvaluations = asInteger(args.stabilityCheck?.minimumEvaluations) || 3;
  return [
    {
      key: "stable_candidate_gate",
      label: "Stable candidate gate",
      status: stableEnough ? "pass" as const : "block" as const,
      value: args.stabilityCheck?.status || null,
      message: stableEnough
        ? "Shadow stability gate is stable enough for offline pilot review."
        : "Offline pilot readiness requires a stable_candidate shadow stability result.",
    },
    {
      key: "minimum_shadow_history",
      label: "Minimum shadow history",
      status: evaluationsConsidered >= minimumEvaluations ? "pass" as const : "block" as const,
      value: `${evaluationsConsidered}/${minimumEvaluations}`,
      message: evaluationsConsidered >= minimumEvaluations
        ? "Enough shadow evaluations were considered by the stability gate."
        : "More shadow evaluation history is required before offline pilot readiness.",
    },
    {
      key: "metric_stability",
      label: "Metric stability",
      status: asNumber(args.stabilityCheck?.avgDeltaF1Pct) != null && asNumber(args.stabilityCheck?.avgDeltaBalancedAccuracyPct) != null ? "pass" as const : "block" as const,
      value: {
        avgDeltaF1Pct: args.stabilityCheck?.avgDeltaF1Pct ?? null,
        avgDeltaBalancedAccuracyPct: args.stabilityCheck?.avgDeltaBalancedAccuracyPct ?? null,
      },
      message: "F1 and Balanced Accuracy deltas must be available from the stability gate.",
    },
    {
      key: "owner_approval",
      label: "Owner approval",
      status: args.ownerApproved && Boolean(args.ownerName) ? "pass" as const : "block" as const,
      value: args.ownerName,
      message: args.ownerApproved && args.ownerName
        ? "Named owner approved the offline pilot readiness gate."
        : "A named owner approval is required before offline pilot readiness can pass.",
    },
    {
      key: "pilot_owner",
      label: "Pilot owner",
      status: args.pilotOwner ? "pass" as const : "block" as const,
      value: args.pilotOwner,
      message: args.pilotOwner
        ? "Pilot owner is recorded."
        : "Pilot owner must be recorded for accountability.",
    },
    {
      key: "rollback_owner",
      label: "Rollback owner",
      status: args.rollbackOwner ? "pass" as const : "block" as const,
      value: args.rollbackOwner,
      message: args.rollbackOwner
        ? "Rollback owner is recorded."
        : "Rollback owner must be recorded before an offline pilot can be considered ready.",
    },
    {
      key: "production_safety_policy",
      label: "Production safety policy",
      status: "pass" as const,
      value: false,
      message: "Production integration, inference runtime, decision automation, and inventory/accounting changes remain disabled.",
    },
  ];
};

const determineStatus = (checks: ReturnType<typeof buildChecks>, stableEnough: boolean, ownerApproved: boolean): OfflinePilotReadinessStatus => {
  const blockingKeys = checks.filter((check) => check.status === "block").map((check) => check.key);
  if (!stableEnough) return "insufficient_stability";
  if (blockingKeys.includes("owner_approval") || blockingKeys.includes("pilot_owner") || blockingKeys.includes("rollback_owner")) {
    return ownerApproved ? "blocked" : "needs_owner_approval";
  }
  if (blockingKeys.length) return "blocked";
  return "pilot_ready";
};

const buildSummary = (args: {
  generatedAt: string;
  stabilityCheck: Record<string, unknown> | null;
  ownerApproved: boolean;
  ownerName: string | null;
  pilotOwner: string | null;
  rollbackOwner: string | null;
  monitoringCadence: string;
}): InventoryStockoutOfflinePilotReadinessSummary => {
  const checks = buildChecks(args);
  const stableEnough = args.stabilityCheck?.status === ACCEPTED_STABILITY_STATUS && asBoolean(args.stabilityCheck?.stableEnoughForOfflinePilot);
  const status = determineStatus(checks, stableEnough, args.ownerApproved);
  const blockers = checks.filter((check) => check.status === "block").map((check) => check.message);
  const warnings = checks.filter((check) => check.status === "warning").map((check) => check.message);
  const recommendedNextAction = status === "pilot_ready"
    ? "Offline pilot readiness is recorded. Continue with audit-only pilot planning; do not enable production inference."
    : status === "needs_owner_approval"
      ? "Get named owner approval, pilot owner, and rollback owner before recording pilot readiness."
      : status === "insufficient_stability"
        ? "Record more successful shadow stability checks before requesting an offline pilot gate."
        : "Resolve blockers before any offline pilot readiness is recorded.";

  return {
    gateKey: CONTRACT_KEY,
    generatedAt: args.generatedAt,
    importId: asNumber(args.stabilityCheck?.importId),
    stabilityCheckId: asNumber(args.stabilityCheck?.id),
    modelKey: normalizeText(args.stabilityCheck?.modelKey),
    modelVersion: normalizeText(args.stabilityCheck?.modelVersion),
    stabilityStatus: normalizeText(args.stabilityCheck?.status),
    stabilityEvaluationsConsidered: asInteger(args.stabilityCheck?.evaluationsConsidered),
    minimumEvaluations: asInteger(args.stabilityCheck?.minimumEvaluations) || 3,
    avgDeltaF1Pct: roundPct(asNumber(args.stabilityCheck?.avgDeltaF1Pct)),
    avgDeltaBalancedAccuracyPct: roundPct(asNumber(args.stabilityCheck?.avgDeltaBalancedAccuracyPct)),
    ownerApproved: args.ownerApproved,
    ownerName: args.ownerName,
    pilotOwner: args.pilotOwner,
    rollbackOwner: args.rollbackOwner,
    monitoringCadence: args.monitoringCadence,
    status,
    offlinePilotReady: status === "pilot_ready",
    productionIntegrationAllowed: false,
    inferenceRuntimeEnabled: false,
    decisionAutomationAllowed: false,
    canChangeInventoryOrAccounting: false,
    checks,
    blockers,
    warnings,
    recommendedNextAction,
  };
};

export const buildInventoryStockoutOfflinePilotReadinessContract = buildContract;

export const buildInventoryStockoutOfflinePilotReadinessGate = async (
  importIdInput?: unknown,
  options: Record<string, unknown> = {},
  shouldRecord = false,
  userId?: number | null,
): Promise<InventoryStockoutOfflinePilotReadinessResponse> => {
  const generatedAt = new Date().toISOString();
  const contract = buildContract();
  const stabilityCheck = await pickLatestStabilityCheck(importIdInput);
  const ownerApproved = asBoolean(options.ownerApproved ?? options.approvedByOwner);
  const ownerName = normalizeText(options.ownerName ?? options.approverName);
  const pilotOwner = normalizeText(options.pilotOwner ?? options.ownerName ?? options.approverName);
  const rollbackOwner = normalizeText(options.rollbackOwner ?? options.pilotOwner ?? options.ownerName ?? options.approverName);
  const monitoringCadence = normalizeText(options.monitoringCadence, DEFAULT_MONITORING_CADENCE) || DEFAULT_MONITORING_CADENCE;
  const rollbackPolicy = buildRollbackPolicy(rollbackOwner);
  const monitoringPlan = buildMonitoringPlan(monitoringCadence);
  const summary = buildSummary({
    generatedAt,
    stabilityCheck,
    ownerApproved,
    ownerName,
    pilotOwner,
    rollbackOwner,
    monitoringCadence,
  });
  let readinessRecord: Record<string, unknown> | null = null;

  if (shouldRecord) {
    readinessRecord = await recordMlOfflinePilotReadinessCheck({
      gateKey: CONTRACT_KEY,
      importId: summary.importId,
      stabilityCheckId: summary.stabilityCheckId,
      modelKey: summary.modelKey,
      modelVersion: summary.modelVersion,
      stabilityStatus: summary.stabilityStatus,
      stabilityEvaluationsConsidered: summary.stabilityEvaluationsConsidered,
      minimumEvaluations: summary.minimumEvaluations,
      avgDeltaF1Pct: summary.avgDeltaF1Pct,
      avgDeltaBalancedAccuracyPct: summary.avgDeltaBalancedAccuracyPct,
      ownerApproved: summary.ownerApproved,
      ownerName: summary.ownerName,
      pilotOwner: summary.pilotOwner,
      rollbackOwner: summary.rollbackOwner,
      monitoringCadence: summary.monitoringCadence,
      status: summary.status,
      offlinePilotReady: summary.offlinePilotReady,
      rollbackPolicy,
      monitoringPlan,
      summary,
      policy: contract,
      userId: userId || null,
    }) as Record<string, unknown> | null;
  }

  return {
    generatedAt,
    contract,
    summary,
    latestStabilityCheck: stabilityCheck,
    rollbackPolicy,
    monitoringPlan,
    operationalPolicy: {
      offlinePilotOnly: true,
      productionIntegrationAllowed: false,
      inferenceRuntimeEnabled: false,
      decisionAutomationAllowed: false,
      message: "offline pilot readiness فقط یک gate ممیزی است و هیچ تصمیم عملیاتی، خرید، موجودی، قیمت‌گذاری یا حسابداری را تغییر نمی‌دهد.",
    },
    readinessRecord,
  };
};

export const recordInventoryStockoutOfflinePilotReadinessGate = async (payload: Record<string, unknown> = {}) => {
  return buildInventoryStockoutOfflinePilotReadinessGate(
    payload.importId,
    payload,
    true,
    asNumber(payload.userId),
  );
};

export const buildMlOfflinePilotReadinessCatalogSummary = async (): Promise<MlOfflinePilotReadinessCatalogSummary> => {
  const generatedAt = new Date().toISOString();
  const current = await buildInventoryStockoutOfflinePilotReadinessGate();
  const lastOfflinePilotChecks = await listMlOfflinePilotReadinessChecks(10) as Array<Record<string, unknown>>;
  return {
    generatedAt,
    contract: buildContract(),
    currentOfflinePilotReadiness: current.summary,
    lastOfflinePilotChecks,
    recommendedNextAction: current.summary.recommendedNextAction,
  };
};
