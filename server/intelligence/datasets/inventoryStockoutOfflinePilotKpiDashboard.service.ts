import {
  getMlModelResultImportById,
  listMlModelResultImports,
  listMlOfflinePilotDecisionReviews,
  listMlOfflinePilotDecisionReviewsByImportId,
  listMlOfflinePilotReadinessChecksByImportId,
  listMlOfflinePilotReviewExports,
  listMlOfflinePilotReviewExportsByImportId,
  listMlOfflinePilotReviewPacks,
  listMlOfflinePilotReviewPacksByImportId,
  listMlShadowEvaluationsByImportId,
  listMlShadowStabilityChecksByImportId,
  recordMlOfflinePilotReviewExport,
} from "../../db/domains/mlDatasets.db";
import { buildInventoryStockoutOfflinePilotReviewPack } from "./inventoryStockoutOfflinePilotReviewPack.service";
import type {
  InventoryStockoutOfflinePilotKpiDashboardContract,
  InventoryStockoutOfflinePilotKpiDashboardResponse,
  InventoryStockoutOfflinePilotKpiDashboardSummary,
  InventoryStockoutOfflinePilotReviewExportResponse,
  MlOfflinePilotKpiDashboardCatalogSummary,
  OfflinePilotKpiDashboardStatus,
} from "./datasetTypes";

const CONTRACT_KEY = "inventory_stockout_offline_pilot_kpi_dashboard_v1" as const;
const CONTRACT_VERSION = "v1" as const;
const ACCEPTED_REVIEW_PACK_KEY = "inventory_stockout_offline_pilot_outcome_review_pack_v1" as const;
const DASHBOARD_SCOPE = "offline_pilot_management_dashboard_only" as const;
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

const boolValue = (value: unknown): boolean => value === true || value === 1 || value === "1" || value === "true";

const buildContract = (): InventoryStockoutOfflinePilotKpiDashboardContract => ({
  contractKey: CONTRACT_KEY,
  contractVersion: CONTRACT_VERSION,
  generatedAt: new Date().toISOString(),
  purpose: "Build an audit-only management KPI dashboard and review export for the offline inventory stockout pilot by summarizing review packs, shadow metrics, stability, pilot readiness, board decisions, rollback status, timeline, and next action without enabling production inference.",
  acceptedReviewPackKey: ACCEPTED_REVIEW_PACK_KEY,
  dashboardScope: DASHBOARD_SCOPE,
  requiredKpis: [
    "pilot_readiness_pct",
    "shadow_evaluations_count",
    "avg_delta_f1_pct",
    "avg_delta_balanced_accuracy_pct",
    "rollback_status",
    "board_decision",
    "recommendation",
    "risk_item_count",
  ],
  exportFormats: ["json", "markdown"],
  exportRules: [
    "Review exports must be derived from the audit-only outcome review pack and related shadow/pilot/board tables.",
    "Review exports may be used for management review, offline pilot documentation, and rollback discussion only.",
    "Review exports must not be used as production model promotion evidence without a separate future production-readiness phase.",
  ],
  forbiddenBehavior: [
    "Do not run model code inside Kourosh.",
    "Do not create live inference endpoints.",
    "Do not promote an external model to production from the KPI dashboard or review export.",
    "Do not change inventory, purchasing, pricing, accounting, reports, invoices, ledgers, or customer messages from this dashboard/export.",
  ],
  operationalPolicy: {
    productionIntegrationAllowed: false,
    inferenceRuntimeEnabled: false,
    decisionAutomationAllowed: false,
    canChangeInventoryOrAccounting: false,
  },
});

const pickLatestImportId = async (): Promise<number | null> => {
  const packs = await listMlOfflinePilotReviewPacks(25) as Array<Record<string, unknown>>;
  const fromPack = packs.find((row) => asNumber(row.importId));
  if (fromPack) return asNumber(fromPack.importId);
  const decisions = await listMlOfflinePilotDecisionReviews(25) as Array<Record<string, unknown>>;
  const fromDecision = decisions.find((row) => asNumber(row.importId));
  if (fromDecision) return asNumber(fromDecision.importId);
  const imports = await listMlModelResultImports(25) as Array<Record<string, unknown>>;
  return asNumber(imports[0]?.id);
};

const computePilotReadinessPct = (args: {
  reviewPackStatus: string | null;
  recommendation: string | null;
  rollbackStatus: string | null;
  stabilityStatus: string | null;
  offlinePilotStatus: string | null;
  boardStatus: string | null;
  shadowEvaluationsCount: number;
  blockers: string[];
}): number => {
  let score = 0;
  if (args.shadowEvaluationsCount > 0) score += 15;
  if (args.stabilityStatus === "stable_candidate") score += 20;
  if (args.offlinePilotStatus === "pilot_ready") score += 20;
  if (args.boardStatus === "continue_pilot") score += 15;
  if (args.reviewPackStatus === "pack_ready") score += 15;
  if (args.recommendation === "continue_offline_pilot") score += 10;
  if (args.rollbackStatus === "not_required") score += 5;
  if (args.rollbackStatus === "rollback_required") score -= 30;
  if (args.rollbackStatus === "rollback_recommended") score -= 15;
  if (args.blockers.length) score -= 20;
  return Math.max(0, Math.min(100, Math.round(score)));
};

const statusFromSignals = (args: {
  readinessPct: number;
  recommendation: string | null;
  rollbackStatus: string | null;
  blockers: string[];
  warnings: string[];
}): OfflinePilotKpiDashboardStatus => {
  if (args.blockers.length) return "blocked";
  if (args.rollbackStatus === "rollback_required" || args.recommendation === "rollback") return "rollback_required";
  if (args.rollbackStatus === "rollback_recommended") return "review_required";
  if (args.readinessPct >= 80 && args.recommendation === "continue_offline_pilot") return "dashboard_ready";
  if (args.warnings.length) return "review_required";
  return "insufficient_review_data";
};

const buildRecommendedNextAction = (summary: InventoryStockoutOfflinePilotKpiDashboardSummary): string => {
  if (summary.blockers.length) return summary.blockers[0];
  if (summary.status === "rollback_required") return "rollback جلسه review را ثبت کن و Rule/Statistical Baseline را به‌عنوان تنها مرجع فعال نگه دار.";
  if (summary.status === "dashboard_ready") return "KPI dashboard و review export آماده ارائه مدیریتی است؛ pilot فقط آفلاین ادامه پیدا کند و production inference فعال نشود.";
  if (summary.status === "review_required") return "dashboard را در review board بررسی کن و قبل از ادامه pilot، warningهای metric/rollback را resolve کن.";
  return "ابتدا outcome review pack، shadow history و board decision کافی جمع کن، سپس export مدیریتی بساز.";
};

const buildKpiCards = (summary: InventoryStockoutOfflinePilotKpiDashboardSummary) => [
  {
    key: "pilot_readiness_pct",
    label: "Offline Pilot Readiness",
    value: summary.pilotReadinessPct,
    unit: "%",
    status: summary.pilotReadinessPct >= 80 ? "good" : summary.pilotReadinessPct >= 50 ? "watch" : "weak",
    message: "Audit-only readiness score for the offline pilot review chain.",
  },
  {
    key: "shadow_evaluations_count",
    label: "Shadow Evaluations",
    value: summary.shadowEvaluationsCount,
    unit: "count",
    status: summary.shadowEvaluationsCount >= 3 ? "good" : summary.shadowEvaluationsCount >= 1 ? "watch" : "weak",
    message: "Number of shadow evaluations supporting the review pack.",
  },
  {
    key: "avg_delta_f1_pct",
    label: "Average Delta F1",
    value: summary.avgDeltaF1Pct,
    unit: "pct points",
    status: summary.avgDeltaF1Pct == null ? "weak" : summary.avgDeltaF1Pct >= 0 ? "good" : "watch",
    message: "Candidate F1 compared with the Rule/Statistical Baseline.",
  },
  {
    key: "avg_delta_balanced_accuracy_pct",
    label: "Average Delta Balanced Accuracy",
    value: summary.avgDeltaBalancedAccuracyPct,
    unit: "pct points",
    status: summary.avgDeltaBalancedAccuracyPct == null ? "weak" : summary.avgDeltaBalancedAccuracyPct >= 0 ? "good" : "watch",
    message: "Candidate balanced accuracy compared with the Rule/Statistical Baseline.",
  },
  {
    key: "rollback_status",
    label: "Rollback Status",
    value: summary.rollbackStatus,
    unit: "status",
    status: summary.rollbackStatus === "not_required" ? "good" : summary.rollbackStatus === "watch" ? "watch" : "weak",
    message: "Rollback signal derived from review pack and board decisions.",
  },
  {
    key: "board_decision",
    label: "Board Decision",
    value: summary.boardDecision || "unknown",
    unit: "decision",
    status: summary.boardDecision === "continue_pilot" ? "good" : summary.boardDecision === "rollback" ? "weak" : "watch",
    message: "Latest human review board decision for the offline pilot.",
  },
];

const buildTimeline = (reviewPack: Record<string, unknown>) => {
  const timeline = Array.isArray((reviewPack as any).timeline) ? (reviewPack as any).timeline : [];
  return timeline.map((row: Record<string, unknown>, index: number) => ({
    step: index + 1,
    key: row.key || `timeline_${index + 1}`,
    label: row.label || null,
    status: row.status || row.decision || null,
    at: row.at || null,
    metrics: row.metrics || null,
  }));
};

const buildMarkdownExport = (args: {
  generatedAt: string;
  summary: InventoryStockoutOfflinePilotKpiDashboardSummary;
  kpiCards: Array<Record<string, unknown>>;
  timeline: Array<Record<string, unknown>>;
  reviewPack: Record<string, unknown>;
}): string => {
  const { summary, kpiCards, timeline } = args;
  const cards = kpiCards.map((card) => `| ${card.key} | ${card.value ?? "—"} | ${card.status || "—"} |`).join("\n");
  const timelineRows = timeline.length
    ? timeline.map((item) => `| ${item.step} | ${item.label || item.key} | ${item.status || "—"} | ${item.at || "—"} |`).join("\n")
    : "| — | No timeline yet | — | — |";
  return [
    "# Inventory Stockout Offline Pilot KPI Dashboard + Review Export",
    "",
    `Generated at: ${args.generatedAt}`,
    "",
    "## Executive Summary",
    "",
    `- Status: ${summary.status}`,
    `- Model: ${summary.modelKey || "unknown"} / ${summary.modelVersion || "unknown"}`,
    `- Pilot readiness: ${summary.pilotReadinessPct}%`,
    `- Recommendation: ${summary.recommendation || "unknown"}`,
    `- Rollback status: ${summary.rollbackStatus}`,
    `- Board decision: ${summary.boardDecision || "unknown"}`,
    `- Avg delta F1: ${summary.avgDeltaF1Pct ?? "—"}`,
    `- Avg delta balanced accuracy: ${summary.avgDeltaBalancedAccuracyPct ?? "—"}`,
    "",
    "## KPI Cards",
    "",
    "| KPI | Value | Status |",
    "| --- | ---: | --- |",
    cards || "| — | — | — |",
    "",
    "## Timeline",
    "",
    "| Step | Event | Status | Time |",
    "| ---: | --- | --- | --- |",
    timelineRows,
    "",
    "## Risks / Blockers",
    "",
    ...(summary.blockers.length ? summary.blockers.map((item) => `- BLOCKER: ${item}`) : ["- No blockers recorded in the current dashboard."]),
    ...(summary.warnings.length ? summary.warnings.map((item) => `- WARNING: ${item}`) : ["- No warnings recorded in the current dashboard."]),
    "",
    "## Operational Boundary",
    "",
    "This export is audit-only. It does not enable production inference, model promotion, decision automation, inventory/accounting changes, pricing changes, reports mutations, invoices, ledgers, or customer messages.",
    "",
    "## Recommended Next Action",
    "",
    summary.recommendedNextAction,
    "",
  ].join("\n");
};

const buildResponse = async (
  importIdInput?: unknown,
  shouldRecord = false,
  userId?: number | null,
  options: Record<string, unknown> = {},
): Promise<InventoryStockoutOfflinePilotKpiDashboardResponse> => {
  const generatedAt = new Date().toISOString();
  const contract = buildContract();
  const requestedImportId = asNumber(importIdInput);
  const importId = requestedImportId || await pickLatestImportId();
  const lookbackEvaluations = Math.max(1, Math.min(50, asInteger(options.lookbackEvaluations) || DEFAULT_LOOKBACK_EVALUATIONS));
  const modelImport = importId ? await getMlModelResultImportById(importId) as Record<string, unknown> | null : null;
  const reviewPackResponse = importId ? await buildInventoryStockoutOfflinePilotReviewPack(importId, { lookbackEvaluations }) : null;
  const reviewPackSummary = reviewPackResponse?.summary || null;
  const shadowEvaluations = importId ? await listMlShadowEvaluationsByImportId(importId, lookbackEvaluations) as Array<Record<string, unknown>> : [];
  const stabilityGate = importId ? (await listMlShadowStabilityChecksByImportId(importId, 1) as Array<Record<string, unknown>>)[0] || null : null;
  const offlinePilotReadiness = importId ? (await listMlOfflinePilotReadinessChecksByImportId(importId, 1) as Array<Record<string, unknown>>)[0] || null : null;
  const decisionBoard = importId ? (await listMlOfflinePilotDecisionReviewsByImportId(importId, 1) as Array<Record<string, unknown>>)[0] || null : null;
  const reviewPacks = importId ? await listMlOfflinePilotReviewPacksByImportId(importId, 10) as Array<Record<string, unknown>> : [];
  const previousExports = importId ? await listMlOfflinePilotReviewExportsByImportId(importId, 10) as Array<Record<string, unknown>> : [];
  const blockers = [...(reviewPackSummary?.blockers || [])];
  const warnings = [...(reviewPackSummary?.warnings || [])];
  const modelKey = normalizeText(reviewPackSummary?.modelKey || modelImport?.modelKey || decisionBoard?.modelKey);
  const modelVersion = normalizeText(reviewPackSummary?.modelVersion || modelImport?.modelVersion || decisionBoard?.modelVersion);
  const boardDecision = normalizeText(reviewPackSummary?.boardDecision || decisionBoard?.boardDecision);
  const boardStatus = normalizeText(reviewPackSummary?.boardStatus || decisionBoard?.boardStatus);
  const rollbackStatus = (normalizeText(reviewPackSummary?.rollbackStatus, "not_required") || "not_required") as InventoryStockoutOfflinePilotKpiDashboardSummary["rollbackStatus"];
  const recommendation = normalizeText(reviewPackSummary?.recommendation);
  const stabilityStatus = normalizeText(reviewPackSummary?.stabilityStatus || stabilityGate?.status);
  const offlinePilotStatus = normalizeText(reviewPackSummary?.offlinePilotStatus || offlinePilotReadiness?.status);
  const shadowEvaluationsCount = asInteger(reviewPackSummary?.shadowEvaluationsCount) || shadowEvaluations.length;
  const avgDeltaF1Pct = roundPct(asNumber(reviewPackSummary?.avgDeltaF1Pct ?? stabilityGate?.avgDeltaF1Pct ?? offlinePilotReadiness?.avgDeltaF1Pct ?? decisionBoard?.avgDeltaF1Pct));
  const avgDeltaBalancedAccuracyPct = roundPct(asNumber(reviewPackSummary?.avgDeltaBalancedAccuracyPct ?? stabilityGate?.avgDeltaBalancedAccuracyPct ?? offlinePilotReadiness?.avgDeltaBalancedAccuracyPct ?? decisionBoard?.avgDeltaBalancedAccuracyPct));

  if (!importId) blockers.push("برای ساخت KPI dashboard هیچ model import معتبری پیدا نشد.");
  if (!reviewPackSummary) blockers.push("ابتدا باید outcome review pack برای این import ساخته شود.");
  if (reviewPacks.length < 1) warnings.push("هیچ review pack ذخیره‌شده‌ای برای audit export پیدا نشد؛ dashboard از snapshot لحظه‌ای ساخته می‌شود.");
  if (shadowEvaluationsCount < 1) warnings.push("KPI dashboard هنوز shadow history کافی ندارد.");
  if (rollbackStatus === "rollback_required" || recommendation === "rollback") warnings.push("rollback در review pack فعلی الزامی یا توصیه شده است.");

  const pilotReadinessPct = computePilotReadinessPct({
    reviewPackStatus: normalizeText(reviewPackSummary?.status),
    recommendation,
    rollbackStatus,
    stabilityStatus,
    offlinePilotStatus,
    boardStatus,
    shadowEvaluationsCount,
    blockers,
  });
  const status = statusFromSignals({ readinessPct: pilotReadinessPct, recommendation, rollbackStatus, blockers, warnings });
  const riskItemCount = blockers.length + warnings.length;
  const summary: InventoryStockoutOfflinePilotKpiDashboardSummary = {
    dashboardKey: CONTRACT_KEY,
    generatedAt,
    importId,
    modelKey,
    modelVersion,
    pilotReadinessPct,
    shadowEvaluationsCount,
    avgDeltaF1Pct,
    avgDeltaBalancedAccuracyPct,
    rollbackStatus,
    boardDecision,
    boardStatus,
    recommendation,
    stabilityStatus,
    offlinePilotStatus,
    reviewPackCount: reviewPacks.length,
    exportCount: previousExports.length,
    riskItemCount,
    status,
    productionIntegrationAllowed: false,
    inferenceRuntimeEnabled: false,
    decisionAutomationAllowed: false,
    canChangeInventoryOrAccounting: false,
    blockers,
    warnings,
    recommendedNextAction: "",
  };
  summary.recommendedNextAction = buildRecommendedNextAction(summary);

  const kpiCards = buildKpiCards(summary);
  const timeline = buildTimeline(reviewPackResponse || {});
  const reviewExport = {
    exportKey: "inventory_stockout_offline_pilot_management_review_export_v1",
    generatedAt,
    summary,
    kpiCards,
    timeline,
    reviewPack: reviewPackResponse,
    sourceTables: [
      "ml_model_result_imports",
      "ml_shadow_evaluations",
      "ml_shadow_stability_checks",
      "ml_offline_pilot_readiness_checks",
      "ml_offline_pilot_decision_reviews",
      "ml_offline_pilot_review_packs",
    ],
    operationalBoundary: contract.operationalPolicy,
  };
  const markdownExport = buildMarkdownExport({ generatedAt, summary, kpiCards, timeline, reviewPack: reviewPackResponse || {} });
  let exportRecord: Record<string, unknown> | null = null;

  if (shouldRecord) {
    exportRecord = await recordMlOfflinePilotReviewExport({
      exportKey: "inventory_stockout_offline_pilot_management_review_export_v1",
      importId,
      reviewPackId: asNumber(reviewPacks[0]?.id),
      modelKey,
      modelVersion,
      dashboardStatus: summary.status,
      recommendation: summary.recommendation,
      rollbackStatus: summary.rollbackStatus,
      pilotReadinessPct: summary.pilotReadinessPct,
      shadowEvaluationsCount: summary.shadowEvaluationsCount,
      avgDeltaF1Pct: summary.avgDeltaF1Pct,
      avgDeltaBalancedAccuracyPct: summary.avgDeltaBalancedAccuracyPct,
      exportFormat: "json_markdown_bundle",
      kpiJson: { summary, kpiCards },
      exportJson: reviewExport,
      exportMarkdown: markdownExport,
      summary,
      policy: contract,
      userId: userId || null,
    }) as Record<string, unknown> | null;
  }

  return {
    generatedAt,
    contract,
    summary,
    kpiCards,
    timeline,
    reviewExport,
    markdownExport,
    latestReviewPack: reviewPackResponse,
    previousExports,
    operationalPolicy: {
      offlineDashboardOnly: true,
      productionIntegrationAllowed: false,
      inferenceRuntimeEnabled: false,
      decisionAutomationAllowed: false,
      message: "KPI dashboard و review export فقط برای مدیریت pilot آفلاین هستند و هیچ inference، automation، inventory/accounting mutation یا production integration را فعال نمی‌کنند.",
    },
    exportRecord,
  };
};

export const buildInventoryStockoutOfflinePilotKpiDashboardContract = buildContract;

export const buildInventoryStockoutOfflinePilotKpiDashboard = async (
  importIdInput?: unknown,
  options: Record<string, unknown> = {},
): Promise<InventoryStockoutOfflinePilotKpiDashboardResponse> => buildResponse(importIdInput, false, null, options);

export const recordInventoryStockoutOfflinePilotReviewExport = async (options: Record<string, unknown> = {}) => buildResponse(
  options.importId,
  true,
  asNumber(options.userId),
  options,
);

export const buildInventoryStockoutOfflinePilotReviewExportJson = async (
  importIdInput?: unknown,
  options: Record<string, unknown> = {},
): Promise<Record<string, unknown>> => {
  const response = await buildResponse(importIdInput, false, null, options);
  return response.reviewExport;
};

export const buildInventoryStockoutOfflinePilotReviewExportMarkdown = async (
  importIdInput?: unknown,
  options: Record<string, unknown> = {},
): Promise<string> => {
  const response = await buildResponse(importIdInput, false, null, options);
  return response.markdownExport;
};

export const listInventoryStockoutOfflinePilotReviewExports = async (importIdInput: unknown, limitInput?: unknown) => listMlOfflinePilotReviewExportsByImportId(importIdInput, limitInput);

export const buildMlOfflinePilotKpiDashboardCatalogSummary = async (): Promise<MlOfflinePilotKpiDashboardCatalogSummary> => {
  const generatedAt = new Date().toISOString();
  const contract = buildContract();
  const lastReviewExports = await listMlOfflinePilotReviewExports(10) as Array<Record<string, unknown>>;
  const current = await buildInventoryStockoutOfflinePilotKpiDashboard();
  return {
    generatedAt,
    contract,
    currentKpiDashboard: current.summary,
    kpiCards: current.kpiCards,
    lastReviewExports,
    recommendedNextAction: current.summary.recommendedNextAction,
  };
};
