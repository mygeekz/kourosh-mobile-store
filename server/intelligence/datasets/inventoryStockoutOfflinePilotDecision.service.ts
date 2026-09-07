import {
  listMlOfflinePilotDecisionReviews,
  listMlOfflinePilotDecisionReviewsByImportId,
  listMlOfflinePilotReadinessChecks,
  listMlOfflinePilotReadinessChecksByImportId,
  recordMlOfflinePilotDecisionReview,
} from "../../db/domains/mlDatasets.db";
import type {
  InventoryStockoutOfflinePilotDecisionCheck,
  InventoryStockoutOfflinePilotDecisionContract,
  InventoryStockoutOfflinePilotDecisionResponse,
  InventoryStockoutOfflinePilotDecisionSummary,
  MlOfflinePilotDecisionCatalogSummary,
  OfflinePilotBoardDecision,
  OfflinePilotBoardStatus,
} from "./datasetTypes";

const CONTRACT_KEY = "inventory_stockout_offline_pilot_human_review_board_v1" as const;
const CONTRACT_VERSION = "v1" as const;
const DECISION_KEY = "inventory_stockout_offline_pilot_decision_log_v1" as const;
const ACCEPTED_OFFLINE_PILOT_GATE_KEY = "inventory_stockout_offline_pilot_readiness_gate_v1" as const;
const ACCEPTED_OFFLINE_PILOT_STATUS = "pilot_ready" as const;
const BOARD_SCOPE = "offline_pilot_human_review_only" as const;
const QUORUM_REQUIRED = 2;

const asNumber = (value: unknown): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const asBoolean = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  const text = String(value ?? "").trim().toLowerCase();
  return ["1", "true", "yes", "ready", "pilot_ready", "approved"].includes(text);
};

const normalizeText = (value: unknown, fallback: string | null = null): string | null => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const roundPct = (value: number | null): number | null => {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.round(value * 100) / 100;
};

const normalizeDecision = (value: unknown): OfflinePilotBoardDecision | null => {
  const text = String(value ?? "").trim().toLowerCase();
  if (["continue_pilot", "pause_pilot", "rollback", "needs_more_review"].includes(text)) {
    return text as OfflinePilotBoardDecision;
  }
  return null;
};

const normalizeBoardMembers = (value: unknown): Array<Record<string, unknown>> => {
  if (!Array.isArray(value)) return [];
  return value
    .map((member, index) => {
      if (typeof member === "string") {
        const name = member.trim();
        return name ? { name, role: index === 0 ? "pilot_owner" : "reviewer" } : null;
      }
      if (member && typeof member === "object") {
        const record = member as Record<string, unknown>;
        const name = normalizeText(record.name ?? record.fullName ?? record.memberName);
        const role = normalizeText(record.role, "reviewer");
        if (!name) return null;
        return { ...record, name, role };
      }
      return null;
    })
    .filter(Boolean) as Array<Record<string, unknown>>;
};

const normalizeActionItems = (value: unknown): Array<Record<string, unknown>> => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      if (typeof item === "string") {
        const text = item.trim();
        return text ? { key: `action_${index + 1}`, text, status: "open" } : null;
      }
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        return { key: record.key || `action_${index + 1}`, status: record.status || "open", ...record };
      }
      return null;
    })
    .filter(Boolean) as Array<Record<string, unknown>>;
};

const buildContract = (): InventoryStockoutOfflinePilotDecisionContract => ({
  contractKey: CONTRACT_KEY,
  contractVersion: CONTRACT_VERSION,
  generatedAt: new Date().toISOString(),
  purpose: "Define an audit-only human review board and decision log for an offline stockout pilot after the offline pilot readiness gate passes, without enabling production inference or automated operational decisions.",
  acceptedOfflinePilotGateKey: ACCEPTED_OFFLINE_PILOT_GATE_KEY,
  acceptedOfflinePilotStatus: ACCEPTED_OFFLINE_PILOT_STATUS,
  reviewScope: BOARD_SCOPE,
  allowedDecisions: ["continue_pilot", "pause_pilot", "rollback", "needs_more_review"],
  requiredReviewBoardFields: [
    "reviewBoard[].name",
    "reviewBoard[].role",
    "boardDecision",
    "rationale",
    "pilotOwner",
    "rollbackOwner",
  ],
  decisionRules: [
    "Only review imports whose latest offline pilot readiness gate is pilot_ready.",
    "Require at least two named human reviewers before recording continue_pilot, pause_pilot, rollback, or needs_more_review.",
    "Require a written rationale for every board decision.",
    "Record action items as audit-only follow-up metadata.",
    "Human review board decisions must not enable runtime inference, automated purchases, inventory mutations, pricing changes, ledger entries, reports, invoices, or customer messages.",
  ],
  rollbackRules: [
    "A rollback decision immediately marks the audit status rollback_required.",
    "Rollback keeps the Rule/Statistical Baseline as the only active reference.",
    "After rollback, a new import, approval, shadow stability, and offline pilot readiness cycle is required before another board continuation decision.",
  ],
  forbiddenBehavior: [
    "Do not run model code inside Kourosh.",
    "Do not create inference endpoints.",
    "Do not promote a candidate to production from this review board.",
    "Do not let board decisions change accounting, inventory, pricing, purchasing, reporting, invoices, ledgers, or customer communication automatically.",
  ],
  operationalPolicy: {
    productionIntegrationAllowed: false,
    inferenceRuntimeEnabled: false,
    decisionAutomationAllowed: false,
    canChangeInventoryOrAccounting: false,
  },
});

const pickLatestOfflinePilotReadiness = async (importIdInput?: unknown): Promise<Record<string, unknown> | null> => {
  const importId = asNumber(importIdInput);
  const rows = importId
    ? await listMlOfflinePilotReadinessChecksByImportId(importId, 1) as Array<Record<string, unknown>>
    : await listMlOfflinePilotReadinessChecks(1) as Array<Record<string, unknown>>;
  return rows[0] || null;
};

const buildChecks = (args: {
  readiness: Record<string, unknown> | null;
  boardMembers: Array<Record<string, unknown>>;
  boardDecision: OfflinePilotBoardDecision | null;
  rationale: string | null;
  pilotOwner: string | null;
  rollbackOwner: string | null;
}): InventoryStockoutOfflinePilotDecisionCheck[] => {
  const readinessReady = args.readiness?.status === ACCEPTED_OFFLINE_PILOT_STATUS && asBoolean(args.readiness?.offlinePilotReady);
  const quorumMet = args.boardMembers.length >= QUORUM_REQUIRED;
  return [
    {
      key: "offline_pilot_ready",
      label: "Offline pilot readiness",
      status: readinessReady ? "pass" as const : "block" as const,
      value: args.readiness?.status || null,
      message: readinessReady
        ? "Latest offline pilot readiness gate is pilot_ready."
        : "Human review board decisions require a pilot_ready offline pilot gate.",
    },
    {
      key: "human_review_board_quorum",
      label: "Human review board quorum",
      status: quorumMet ? "pass" as const : "block" as const,
      value: `${args.boardMembers.length}/${QUORUM_REQUIRED}`,
      message: quorumMet
        ? "Human review board quorum is met."
        : "Record at least two named human reviewers before logging a board decision.",
    },
    {
      key: "board_decision",
      label: "Board decision",
      status: args.boardDecision ? "pass" as const : "block" as const,
      value: args.boardDecision,
      message: args.boardDecision
        ? "Board decision is explicit."
        : "A board decision is required: continue_pilot, pause_pilot, rollback, or needs_more_review.",
    },
    {
      key: "decision_rationale",
      label: "Decision rationale",
      status: args.rationale ? "pass" as const : "block" as const,
      value: args.rationale ? "provided" : null,
      message: args.rationale
        ? "Decision rationale is recorded."
        : "A written rationale is required for auditability.",
    },
    {
      key: "pilot_and_rollback_owners",
      label: "Pilot and rollback owners",
      status: args.pilotOwner && args.rollbackOwner ? "pass" as const : "block" as const,
      value: { pilotOwner: args.pilotOwner, rollbackOwner: args.rollbackOwner },
      message: args.pilotOwner && args.rollbackOwner
        ? "Pilot owner and rollback owner are recorded."
        : "Pilot owner and rollback owner are required for board accountability.",
    },
    {
      key: "operational_safety_boundary",
      label: "Operational safety boundary",
      status: "pass" as const,
      value: false,
      message: "Production integration, inference runtime, decision automation, and inventory/accounting changes remain disabled.",
    },
  ];
};

const statusForDecision = (
  readinessReady: boolean,
  boardDecision: OfflinePilotBoardDecision | null,
  checks: InventoryStockoutOfflinePilotDecisionCheck[],
): OfflinePilotBoardStatus => {
  if (!readinessReady) return "insufficient_pilot_readiness";
  if (checks.some((check) => check.status === "block")) return boardDecision ? "blocked" : "needs_more_review";
  if (boardDecision === "rollback") return "rollback_required";
  if (boardDecision === "continue_pilot") return "continue_pilot";
  if (boardDecision === "pause_pilot") return "pause_pilot";
  if (boardDecision === "needs_more_review") return "needs_more_review";
  return "board_ready";
};

const buildSummary = (args: {
  generatedAt: string;
  readiness: Record<string, unknown> | null;
  boardMembers: Array<Record<string, unknown>>;
  boardDecision: OfflinePilotBoardDecision | null;
  rationale: string | null;
  pilotOwner: string | null;
  rollbackOwner: string | null;
}): InventoryStockoutOfflinePilotDecisionSummary => {
  const checks = buildChecks(args);
  const readinessReady = args.readiness?.status === ACCEPTED_OFFLINE_PILOT_STATUS && asBoolean(args.readiness?.offlinePilotReady);
  const boardStatus = statusForDecision(readinessReady, args.boardDecision, checks);
  const blockers = checks.filter((check) => check.status === "block").map((check) => check.message);
  const warnings = checks.filter((check) => check.status === "warning").map((check) => check.message);
  const recommendedNextAction = boardStatus === "continue_pilot"
    ? "Continue the offline pilot review cycle manually; do not enable production inference or automated decisions."
    : boardStatus === "rollback_required"
      ? "Stop the offline pilot review, keep baseline-only reference, and require a fresh import/approval/shadow cycle before retrying."
      : boardStatus === "pause_pilot"
        ? "Pause the offline pilot and resolve board concerns before another decision."
        : boardStatus === "insufficient_pilot_readiness"
          ? "Record a pilot_ready offline pilot readiness gate before convening the human review board."
          : "Complete board quorum, decision, owners, and rationale before recording the decision log.";

  return {
    decisionKey: DECISION_KEY,
    generatedAt: args.generatedAt,
    importId: asNumber(args.readiness?.importId),
    offlinePilotCheckId: asNumber(args.readiness?.id),
    modelKey: normalizeText(args.readiness?.modelKey),
    modelVersion: normalizeText(args.readiness?.modelVersion),
    offlinePilotStatus: normalizeText(args.readiness?.status),
    offlinePilotReady: readinessReady,
    boardDecision: args.boardDecision,
    boardStatus,
    boardScope: BOARD_SCOPE,
    reviewBoardMemberCount: args.boardMembers.length,
    pilotOwner: args.pilotOwner,
    rollbackOwner: args.rollbackOwner,
    avgDeltaF1Pct: roundPct(asNumber(args.readiness?.avgDeltaF1Pct)),
    avgDeltaBalancedAccuracyPct: roundPct(asNumber(args.readiness?.avgDeltaBalancedAccuracyPct)),
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

export const buildInventoryStockoutOfflinePilotDecisionContract = buildContract;

export const buildInventoryStockoutOfflinePilotDecisionBoard = async (
  importIdInput?: unknown,
  options: Record<string, unknown> = {},
  shouldRecord = false,
  userId?: number | null,
): Promise<InventoryStockoutOfflinePilotDecisionResponse> => {
  const generatedAt = new Date().toISOString();
  const contract = buildContract();
  const readiness = await pickLatestOfflinePilotReadiness(importIdInput);
  const boardMembers = normalizeBoardMembers(options.reviewBoard ?? options.boardMembers ?? []);
  const boardDecision = normalizeDecision(options.boardDecision ?? options.decision);
  const rationale = normalizeText(options.rationale ?? options.reason ?? options.reviewerNotes);
  const pilotOwner = normalizeText(options.pilotOwner ?? readiness?.pilotOwner);
  const rollbackOwner = normalizeText(options.rollbackOwner ?? readiness?.rollbackOwner);
  const actionItems = normalizeActionItems(options.actionItems ?? options.followUps ?? []);
  const summary = buildSummary({
    generatedAt,
    readiness,
    boardMembers,
    boardDecision,
    rationale,
    pilotOwner,
    rollbackOwner,
  });
  let decisionRecord: Record<string, unknown> | null = null;

  if (shouldRecord) {
    decisionRecord = await recordMlOfflinePilotDecisionReview({
      decisionKey: DECISION_KEY,
      importId: summary.importId,
      offlinePilotCheckId: summary.offlinePilotCheckId,
      modelKey: summary.modelKey,
      modelVersion: summary.modelVersion,
      boardDecision: summary.boardDecision || "needs_more_review",
      boardStatus: summary.boardStatus,
      boardScope: summary.boardScope,
      avgDeltaF1Pct: summary.avgDeltaF1Pct,
      avgDeltaBalancedAccuracyPct: summary.avgDeltaBalancedAccuracyPct,
      pilotOwner: summary.pilotOwner,
      rollbackOwner: summary.rollbackOwner,
      reviewBoard: { members: boardMembers, quorumRequired: QUORUM_REQUIRED, quorumMet: boardMembers.length >= QUORUM_REQUIRED },
      decision: { boardDecision: summary.boardDecision, rationale, status: summary.boardStatus },
      actionItems,
      summary,
      policy: contract,
      userId: userId || null,
    }) as Record<string, unknown> | null;
  }

  return {
    generatedAt,
    contract,
    summary,
    latestOfflinePilotReadiness: readiness,
    reviewBoard: {
      members: boardMembers,
      quorumRequired: QUORUM_REQUIRED,
      quorumMet: boardMembers.length >= QUORUM_REQUIRED,
    },
    decisionLog: {
      boardDecision: summary.boardDecision,
      rationale,
      actionItems,
    },
    operationalPolicy: {
      offlineHumanReviewOnly: true,
      productionIntegrationAllowed: false,
      inferenceRuntimeEnabled: false,
      decisionAutomationAllowed: false,
      message: "human review board فقط تصمیم و audit pilot آفلاین را ثبت می‌کند و هیچ inference، خرید، موجودی، قیمت‌گذاری، حسابداری یا گزارش رسمی را تغییر نمی‌دهد.",
    },
    decisionRecord,
  };
};

export const recordInventoryStockoutOfflinePilotDecision = async (payload: Record<string, unknown> = {}) => {
  return buildInventoryStockoutOfflinePilotDecisionBoard(
    payload.importId,
    payload,
    true,
    asNumber(payload.userId),
  );
};

export const listInventoryStockoutOfflinePilotDecisionReviews = async (importIdInput: unknown) => {
  return listMlOfflinePilotDecisionReviewsByImportId(importIdInput, 50) as Promise<Array<Record<string, unknown>>>;
};

export const buildMlOfflinePilotDecisionCatalogSummary = async (): Promise<MlOfflinePilotDecisionCatalogSummary> => {
  const generatedAt = new Date().toISOString();
  const current = await buildInventoryStockoutOfflinePilotDecisionBoard();
  const lastDecisionReviews = await listMlOfflinePilotDecisionReviews(10) as Array<Record<string, unknown>>;
  return {
    generatedAt,
    contract: buildContract(),
    currentDecisionBoard: current.summary,
    lastDecisionReviews,
    recommendedNextAction: current.summary.recommendedNextAction,
  };
};
