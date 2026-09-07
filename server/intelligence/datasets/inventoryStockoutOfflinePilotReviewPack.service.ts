import {
  getMlModelResultImportById,
  listMlModelResultImports,
  listMlOfflinePilotDecisionReviews,
  listMlOfflinePilotDecisionReviewsByImportId,
  listMlOfflinePilotReadinessChecksByImportId,
  listMlOfflinePilotReviewPacks,
  listMlOfflinePilotReviewPacksByImportId,
  listMlShadowEvaluationsByImportId,
  listMlShadowStabilityChecksByImportId,
  recordMlOfflinePilotReviewPack,
} from "../../db/domains/mlDatasets.db";
import type {
  InventoryStockoutOfflinePilotReviewPackContract,
  InventoryStockoutOfflinePilotReviewPackResponse,
  InventoryStockoutOfflinePilotReviewPackSummary,
  MlOfflinePilotReviewPackCatalogSummary,
  OfflinePilotOutcomeReviewPackStatus,
} from "./datasetTypes";

const CONTRACT_KEY = "inventory_stockout_offline_pilot_outcome_review_pack_v1" as const;
const CONTRACT_VERSION = "v1" as const;
const ACCEPTED_DECISION_CONTRACT_KEY = "inventory_stockout_offline_pilot_human_review_board_v1" as const;
const PACK_SCOPE = "offline_review_pack_only" as const;
const DEFAULT_LOOKBACK_EVALUATIONS = 10;

const asNumber = (value: unknown): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const asInteger = (value: unknown): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.round(numeric) : 0;
};

const normalizeText = (value: unknown, fallback: string | null = null): string | null => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const roundPct = (value: number | null): number | null => {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.round(value * 100) / 100;
};

const buildContract = (): InventoryStockoutOfflinePilotReviewPackContract => ({
  contractKey: CONTRACT_KEY,
  contractVersion: CONTRACT_VERSION,
  generatedAt: new Date().toISOString(),
  purpose: "Build an audit-only outcome review pack for an offline inventory stockout pilot by summarizing model import metrics, shadow history, stability gates, offline pilot readiness, human board decisions, rollback status, and the recommended next action without enabling production inference.",
  acceptedDecisionContractKey: ACCEPTED_DECISION_CONTRACT_KEY,
  packScope: PACK_SCOPE,
  requiredSections: [
    "model_result_import_summary",
    "shadow_evaluation_trend",
    "stability_gate_summary",
    "offline_pilot_readiness_summary",
    "human_review_board_decisions",
    "rollback_status",
    "recommendation",
  ],
  recommendationRules: [
    "continue_offline_pilot is only allowed when the latest board decision is continue_pilot and no rollback trigger is present.",
    "rollback is required when the latest board decision is rollback or any latest gate is explicitly rollback_required.",
    "pause_for_more_review is used when the board paused the pilot, requested more review, or metric warnings are present.",
    "collect_more_shadow_history is used when shadow/stability history is insufficient.",
    "This pack never promotes a model to production and never enables runtime inference.",
  ],
  rollbackStatusRules: [
    "Rollback is required if the latest board status is rollback_required or boardDecision is rollback.",
    "Rollback is recommended if recent shadow or stability metrics underperform the Rule/Statistical Baseline.",
    "Watch status is used when the pack has warnings but no mandatory rollback trigger.",
    "Not required is used only when the latest board decision is continue_pilot and all observed metric deltas are non-negative.",
  ],
  forbiddenBehavior: [
    "Do not run model code inside Kourosh.",
    "Do not create live inference endpoints.",
    "Do not promote an external model to production from the review pack.",
    "Do not change inventory, purchasing, pricing, accounting, reporting, invoices, ledgers, or customer messages from this pack.",
  ],
  operationalPolicy: {
    productionIntegrationAllowed: false,
    inferenceRuntimeEnabled: false,
    decisionAutomationAllowed: false,
    canChangeInventoryOrAccounting: false,
  },
});

const pickLatestImportId = async (): Promise<number | null> => {
  const decisions = await listMlOfflinePilotDecisionReviews(25) as Array<Record<string, unknown>>;
  const fromDecision = decisions.find((row) => asNumber(row.importId));
  if (fromDecision) return asNumber(fromDecision.importId);
  const imports = await listMlModelResultImports(25) as Array<Record<string, unknown>>;
  return asNumber(imports[0]?.id);
};

const buildTimeline = (args: {
  modelImport: Record<string, unknown> | null;
  shadowEvaluations: Array<Record<string, unknown>>;
  stabilityGate: Record<string, unknown> | null;
  offlinePilotReadiness: Record<string, unknown> | null;
  decisionBoard: Record<string, unknown> | null;
}) => {
  const entries: Array<Record<string, unknown>> = [];
  if (args.modelImport) {
    entries.push({
      key: "model_result_import",
      label: "External model result import",
      status: args.modelImport.status || null,
      at: args.modelImport.createdAt || null,
      metrics: {
        f1Pct: args.modelImport.f1Pct ?? null,
        balancedAccuracyPct: args.modelImport.balancedAccuracyPct ?? null,
        baselineF1Pct: args.modelImport.baselineF1Pct ?? null,
        baselineBalancedAccuracyPct: args.modelImport.baselineBalancedAccuracyPct ?? null,
      },
    });
  }
  args.shadowEvaluations.slice().reverse().forEach((row, index) => {
    entries.push({
      key: `shadow_evaluation_${index + 1}`,
      label: "Shadow evaluation",
      status: row.status || null,
      at: row.createdAt || null,
      metrics: {
        deltaF1Pct: row.deltaF1Pct ?? null,
        deltaBalancedAccuracyPct: row.deltaBalancedAccuracyPct ?? null,
        evaluatedRows: row.evaluatedRows ?? null,
      },
    });
  });
  if (args.stabilityGate) {
    entries.push({
      key: "shadow_stability_gate",
      label: "Shadow stability gate",
      status: args.stabilityGate.status || null,
      at: args.stabilityGate.createdAt || null,
      metrics: {
        evaluationsConsidered: args.stabilityGate.evaluationsConsidered ?? null,
        avgDeltaF1Pct: args.stabilityGate.avgDeltaF1Pct ?? null,
        avgDeltaBalancedAccuracyPct: args.stabilityGate.avgDeltaBalancedAccuracyPct ?? null,
      },
    });
  }
  if (args.offlinePilotReadiness) {
    entries.push({
      key: "offline_pilot_readiness_gate",
      label: "Offline pilot readiness gate",
      status: args.offlinePilotReadiness.status || null,
      at: args.offlinePilotReadiness.createdAt || null,
      metrics: {
        ownerApproved: args.offlinePilotReadiness.ownerApproved ?? null,
        offlinePilotReady: args.offlinePilotReadiness.offlinePilotReady ?? null,
      },
    });
  }
  if (args.decisionBoard) {
    entries.push({
      key: "human_review_board_decision",
      label: "Human review board decision",
      status: args.decisionBoard.boardStatus || null,
      at: args.decisionBoard.createdAt || null,
      decision: args.decisionBoard.boardDecision || null,
    });
  }
  return entries;
};

const determineRollbackStatus = (args: {
  boardDecision: string | null;
  boardStatus: string | null;
  avgDeltaF1Pct: number | null;
  avgDeltaBalancedAccuracyPct: number | null;
  shadowEvaluations: Array<Record<string, unknown>>;
}): "not_required" | "watch" | "rollback_recommended" | "rollback_required" => {
  if (args.boardDecision === "rollback" || args.boardStatus === "rollback_required") return "rollback_required";
  const hasUnderperformingShadow = args.shadowEvaluations.some((row) => {
    const status = normalizeText(row.status);
    return status === "underperforming" || status === "blocked" || status === "insufficient_data";
  });
  if ((args.avgDeltaF1Pct != null && args.avgDeltaF1Pct < 0) || (args.avgDeltaBalancedAccuracyPct != null && args.avgDeltaBalancedAccuracyPct < 0) || hasUnderperformingShadow) {
    return "rollback_recommended";
  }
  if (args.boardDecision === "pause_pilot" || args.boardDecision === "needs_more_review") return "watch";
  return "not_required";
};

const determineRecommendation = (args: {
  boardDecision: string | null;
  boardStatus: string | null;
  offlinePilotStatus: string | null;
  stabilityStatus: string | null;
  shadowEvaluationsCount: number;
  rollbackStatus: "not_required" | "watch" | "rollback_recommended" | "rollback_required";
  blockers: string[];
}): InventoryStockoutOfflinePilotReviewPackSummary["recommendation"] => {
  if (args.blockers.length) return args.shadowEvaluationsCount < 1 ? "collect_more_shadow_history" : "blocked";
  if (args.rollbackStatus === "rollback_required" || args.boardDecision === "rollback") return "rollback";
  if (args.rollbackStatus === "rollback_recommended") return "pause_for_more_review";
  if (args.offlinePilotStatus !== "pilot_ready" || args.stabilityStatus !== "stable_candidate") return "collect_more_shadow_history";
  if (args.boardDecision === "continue_pilot" && args.boardStatus === "continue_pilot") return "continue_offline_pilot";
  return "pause_for_more_review";
};

const statusForRecommendation = (
  recommendation: InventoryStockoutOfflinePilotReviewPackSummary["recommendation"],
  blockers: string[],
): OfflinePilotOutcomeReviewPackStatus => {
  if (blockers.length) return "blocked";
  if (recommendation === "rollback") return "rollback_review";
  if (recommendation === "continue_offline_pilot") return "pack_ready";
  if (recommendation === "collect_more_shadow_history") return "insufficient_offline_pilot_history";
  return "needs_board_decision";
};

const buildRecommendedNextAction = (
  recommendation: InventoryStockoutOfflinePilotReviewPackSummary["recommendation"],
  blockers: string[],
  warnings: string[],
): string => {
  if (blockers.length) return blockers[0];
  if (recommendation === "continue_offline_pilot") return "review pack آماده ارائه است؛ pilot فقط آفلاین ادامه پیدا کند و هیچ production inference فعال نشود.";
  if (recommendation === "rollback") return "rollback را به‌صورت audit-only ثبت و pilot آفلاین را متوقف کنید؛ baseline تنها مرجع فعال باقی بماند.";
  if (recommendation === "collect_more_shadow_history") return "shadow/stability history بیشتری ثبت کنید و سپس review pack را دوباره بسازید.";
  return warnings[0] || "جلسه review board را با همین pack برگزار کنید و ادامه، توقف یا rollback را مستند کنید.";
};

const buildSummary = (args: {
  generatedAt: string;
  importId: number | null;
  modelImport: Record<string, unknown> | null;
  shadowEvaluations: Array<Record<string, unknown>>;
  stabilityGate: Record<string, unknown> | null;
  offlinePilotReadiness: Record<string, unknown> | null;
  decisionBoard: Record<string, unknown> | null;
}): InventoryStockoutOfflinePilotReviewPackSummary => {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const boardDecision = normalizeText(args.decisionBoard?.boardDecision);
  const boardStatus = normalizeText(args.decisionBoard?.boardStatus);
  const offlinePilotStatus = normalizeText(args.offlinePilotReadiness?.status);
  const stabilityStatus = normalizeText(args.stabilityGate?.status);
  const modelKey = normalizeText(args.modelImport?.modelKey || args.decisionBoard?.modelKey || args.offlinePilotReadiness?.modelKey);
  const modelVersion = normalizeText(args.modelImport?.modelVersion || args.decisionBoard?.modelVersion || args.offlinePilotReadiness?.modelVersion);
  const avgDeltaF1Pct = roundPct(asNumber(args.stabilityGate?.avgDeltaF1Pct ?? args.offlinePilotReadiness?.avgDeltaF1Pct ?? args.decisionBoard?.avgDeltaF1Pct));
  const avgDeltaBalancedAccuracyPct = roundPct(asNumber(args.stabilityGate?.avgDeltaBalancedAccuracyPct ?? args.offlinePilotReadiness?.avgDeltaBalancedAccuracyPct ?? args.decisionBoard?.avgDeltaBalancedAccuracyPct));
  const shadowEvaluationsCount = args.shadowEvaluations.length;

  if (!args.importId) blockers.push("برای ساخت outcome review pack هیچ model import معتبری پیدا نشد.");
  if (!args.modelImport) blockers.push("model result import برای این review pack پیدا نشد.");
  if (!args.offlinePilotReadiness || offlinePilotStatus !== "pilot_ready") blockers.push("review pack نیازمند offline pilot readiness با وضعیت pilot_ready است.");
  if (!args.decisionBoard) blockers.push("review pack نیازمند human review board decision است.");
  if (!boardDecision) warnings.push("board decision هنوز مشخص نیست.");
  if (!args.stabilityGate || stabilityStatus !== "stable_candidate") warnings.push("آخرین stability gate برای این import stable_candidate نیست.");
  if (shadowEvaluationsCount < 1) warnings.push("هیچ shadow evaluation برای روند outcome review موجود نیست.");

  const rollbackStatus = determineRollbackStatus({
    boardDecision,
    boardStatus,
    avgDeltaF1Pct,
    avgDeltaBalancedAccuracyPct,
    shadowEvaluations: args.shadowEvaluations,
  });
  if (rollbackStatus === "rollback_recommended") warnings.push("metricها یا shadow history نشان می‌دهد rollback یا pause باید بررسی شود.");

  const recommendation = determineRecommendation({
    boardDecision,
    boardStatus,
    offlinePilotStatus,
    stabilityStatus,
    shadowEvaluationsCount,
    rollbackStatus,
    blockers,
  });
  const status = statusForRecommendation(recommendation, blockers);

  return {
    packKey: CONTRACT_KEY,
    generatedAt: args.generatedAt,
    importId: args.importId,
    modelKey,
    modelVersion,
    boardDecision,
    boardStatus,
    offlinePilotStatus,
    stabilityStatus,
    shadowEvaluationsCount,
    avgDeltaF1Pct,
    avgDeltaBalancedAccuracyPct,
    rollbackStatus,
    recommendation,
    status,
    productionIntegrationAllowed: false,
    inferenceRuntimeEnabled: false,
    decisionAutomationAllowed: false,
    canChangeInventoryOrAccounting: false,
    blockers,
    warnings,
    recommendedNextAction: buildRecommendedNextAction(recommendation, blockers, warnings),
  };
};

const buildExecutiveSummary = (summary: InventoryStockoutOfflinePilotReviewPackSummary) => ({
  title: "Inventory Stockout Offline Pilot Outcome Review Pack",
  status: summary.status,
  model: {
    modelKey: summary.modelKey,
    modelVersion: summary.modelVersion,
  },
  boardDecision: summary.boardDecision,
  rollbackStatus: summary.rollbackStatus,
  recommendation: summary.recommendation,
  metricTrend: {
    avgDeltaF1Pct: summary.avgDeltaF1Pct,
    avgDeltaBalancedAccuracyPct: summary.avgDeltaBalancedAccuracyPct,
    shadowEvaluationsCount: summary.shadowEvaluationsCount,
  },
  safetyBoundary: "audit-only offline pilot review pack; no production inference, decision automation, or inventory/accounting changes",
  recommendedNextAction: summary.recommendedNextAction,
});

const buildRecommendationDetails = (summary: InventoryStockoutOfflinePilotReviewPackSummary) => ({
  recommendation: summary.recommendation,
  rationale: [
    `boardDecision=${summary.boardDecision || "unknown"}`,
    `boardStatus=${summary.boardStatus || "unknown"}`,
    `offlinePilotStatus=${summary.offlinePilotStatus || "unknown"}`,
    `stabilityStatus=${summary.stabilityStatus || "unknown"}`,
    `rollbackStatus=${summary.rollbackStatus}`,
  ],
  allowedNextStep: summary.recommendation === "continue_offline_pilot"
    ? "Continue offline-only review; do not enable production inference."
    : summary.recommendedNextAction,
  forbiddenNextStep: "Do not enable runtime inference, production promotion, automated purchases, inventory mutations, pricing changes, accounting entries, report mutations, invoices, ledgers, or customer messages.",
});

const buildRollbackDetails = (summary: InventoryStockoutOfflinePilotReviewPackSummary) => ({
  rollbackStatus: summary.rollbackStatus,
  rollbackRequired: summary.rollbackStatus === "rollback_required",
  rollbackRecommended: summary.rollbackStatus === "rollback_recommended" || summary.rollbackStatus === "rollback_required",
  triggersObserved: [
    summary.boardDecision === "rollback" ? "board_decision_rollback" : null,
    summary.boardStatus === "rollback_required" ? "board_status_rollback_required" : null,
    summary.avgDeltaF1Pct != null && summary.avgDeltaF1Pct < 0 ? "avg_delta_f1_below_baseline" : null,
    summary.avgDeltaBalancedAccuracyPct != null && summary.avgDeltaBalancedAccuracyPct < 0 ? "avg_delta_balanced_accuracy_below_baseline" : null,
  ].filter(Boolean),
  rollbackAction: "Stop offline pilot review, keep the Rule/Statistical Baseline as the only active reference, document the reason, and require a fresh import + approval + stability cycle before retrying.",
});

const buildResponse = async (
  importIdInput?: unknown,
  shouldRecord = false,
  userId?: number | null,
  options: Record<string, unknown> = {},
): Promise<InventoryStockoutOfflinePilotReviewPackResponse> => {
  const generatedAt = new Date().toISOString();
  const contract = buildContract();
  const requestedImportId = asNumber(importIdInput);
  const importId = requestedImportId || await pickLatestImportId();
  const lookbackEvaluations = Math.max(1, Math.min(50, asInteger(options.lookbackEvaluations) || DEFAULT_LOOKBACK_EVALUATIONS));
  const modelImport = importId ? await getMlModelResultImportById(importId) as Record<string, unknown> | null : null;
  const shadowEvaluations = importId ? await listMlShadowEvaluationsByImportId(importId, lookbackEvaluations) as Array<Record<string, unknown>> : [];
  const stabilityGate = importId ? (await listMlShadowStabilityChecksByImportId(importId, 1) as Array<Record<string, unknown>>)[0] || null : null;
  const offlinePilotReadiness = importId ? (await listMlOfflinePilotReadinessChecksByImportId(importId, 1) as Array<Record<string, unknown>>)[0] || null : null;
  const decisionBoard = importId ? (await listMlOfflinePilotDecisionReviewsByImportId(importId, 1) as Array<Record<string, unknown>>)[0] || null : null;
  const timeline = buildTimeline({ modelImport, shadowEvaluations, stabilityGate, offlinePilotReadiness, decisionBoard });
  const summary = buildSummary({ generatedAt, importId, modelImport, shadowEvaluations, stabilityGate, offlinePilotReadiness, decisionBoard });
  const executiveSummary = buildExecutiveSummary(summary);
  const recommendation = buildRecommendationDetails(summary);
  const rollbackStatus = buildRollbackDetails(summary);
  let reviewPackRecord: Record<string, unknown> | null = null;

  const responseWithoutRecord = {
    generatedAt,
    contract,
    summary,
    executiveSummary,
    timeline,
    pack: {
      modelResultImport: modelImport,
      shadowEvaluations,
      stabilityGate,
      offlinePilotReadiness,
      decisionBoard,
      recommendation,
      rollbackStatus,
    },
    operationalPolicy: {
      offlineReviewPackOnly: true as const,
      productionIntegrationAllowed: false as const,
      inferenceRuntimeEnabled: false as const,
      decisionAutomationAllowed: false as const,
      message: "Outcome review pack فقط برای جلسه review آفلاین است و هیچ inference، automation، inventory/accounting mutation یا production integration را فعال نمی‌کند.",
    },
  };

  if (shouldRecord) {
    reviewPackRecord = await recordMlOfflinePilotReviewPack({
      packKey: CONTRACT_KEY,
      importId,
      offlinePilotCheckId: asNumber(offlinePilotReadiness?.id),
      decisionReviewId: asNumber(decisionBoard?.id),
      modelKey: summary.modelKey,
      modelVersion: summary.modelVersion,
      boardStatus: summary.boardStatus,
      boardDecision: summary.boardDecision,
      shadowEvaluationsCount: summary.shadowEvaluationsCount,
      stabilityStatus: summary.stabilityStatus,
      offlinePilotStatus: summary.offlinePilotStatus,
      rollbackStatus: summary.rollbackStatus,
      recommendation: summary.recommendation,
      executiveSummary,
      reviewPack: responseWithoutRecord.pack,
      timeline,
      summary,
      policy: contract,
      userId: userId || null,
    }) as Record<string, unknown> | null;
  }

  return {
    ...responseWithoutRecord,
    reviewPackRecord,
  };
};

export const buildInventoryStockoutOfflinePilotReviewPackContract = buildContract;

export const buildInventoryStockoutOfflinePilotReviewPack = async (
  importIdInput?: unknown,
  options: Record<string, unknown> = {},
): Promise<InventoryStockoutOfflinePilotReviewPackResponse> => buildResponse(importIdInput, false, null, options);

export const recordInventoryStockoutOfflinePilotReviewPack = async (options: Record<string, unknown> = {}) => buildResponse(
  options.importId,
  true,
  asNumber(options.userId),
  options,
);

export const listInventoryStockoutOfflinePilotReviewPacks = async (importIdInput: unknown, limitInput?: unknown) => listMlOfflinePilotReviewPacksByImportId(importIdInput, limitInput);

export const buildMlOfflinePilotReviewPackCatalogSummary = async (): Promise<MlOfflinePilotReviewPackCatalogSummary> => {
  const generatedAt = new Date().toISOString();
  const contract = buildContract();
  const lastReviewPacks = await listMlOfflinePilotReviewPacks(10) as Array<Record<string, unknown>>;
  const current = await buildInventoryStockoutOfflinePilotReviewPack();
  return {
    generatedAt,
    contract,
    currentReviewPack: current.summary,
    lastReviewPacks,
    recommendedNextAction: current.summary.recommendedNextAction,
  };
};
