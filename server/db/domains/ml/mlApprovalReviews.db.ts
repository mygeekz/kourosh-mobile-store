import { allAsync, getAsync, runAsync } from "../../query";
import { clampLimit, safeJson } from "./mlDbUtils";

export const recordMlModelApprovalReview = async (payload: {
  importId: number;
  reviewKey: string;
  modelKey: string;
  modelVersion: string;
  decision: string;
  approvalStatus: string;
  promotionStage: string;
  approvalScope: string;
  reason?: string | null;
  reviewerNotes?: string | null;
  metricOverride: boolean;
  policy?: Record<string, unknown>;
  gate?: Record<string, unknown>;
  review?: Record<string, unknown>;
  userId?: number | null;
}) => {
  const result = await runAsync(
    `
      INSERT INTO ml_model_approval_reviews (
        import_id, review_key, model_key, model_version, decision,
        approval_status, promotion_stage, approval_scope, reason, reviewer_notes,
        metric_override, policy_json, gate_json, review_json, user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.importId,
      payload.reviewKey,
      payload.modelKey,
      payload.modelVersion,
      payload.decision,
      payload.approvalStatus,
      payload.promotionStage,
      payload.approvalScope,
      payload.reason || null,
      payload.reviewerNotes || null,
      payload.metricOverride ? 1 : 0,
      safeJson(payload.policy || {}),
      safeJson(payload.gate || {}),
      safeJson(payload.review || {}),
      payload.userId || null,
    ],
  );
  return getAsync(`SELECT * FROM ml_model_approval_reviews WHERE id = ?`, [result.lastID]);
};

export const listMlModelApprovalReviews = async (limitInput?: unknown) => {
  const limit = clampLimit(limitInput, 10, 100);
  return allAsync(
    `
      SELECT id, import_id AS importId, review_key AS reviewKey,
             model_key AS modelKey, model_version AS modelVersion,
             decision, approval_status AS approvalStatus,
             promotion_stage AS promotionStage, approval_scope AS approvalScope,
             reason, reviewer_notes AS reviewerNotes,
             metric_override AS metricOverride, created_at AS createdAt,
             user_id AS userId
      FROM ml_model_approval_reviews
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [limit],
  );
};

export const listMlModelApprovalReviewsByImportId = async (importIdInput: unknown, limitInput?: unknown) => {
  const importId = Number(importIdInput);
  if (!Number.isFinite(importId) || importId <= 0) return [];
  const limit = clampLimit(limitInput, 10, 100);
  return allAsync(
    `
      SELECT id, import_id AS importId, review_key AS reviewKey,
             model_key AS modelKey, model_version AS modelVersion,
             decision, approval_status AS approvalStatus,
             promotion_stage AS promotionStage, approval_scope AS approvalScope,
             reason, reviewer_notes AS reviewerNotes,
             metric_override AS metricOverride, created_at AS createdAt,
             user_id AS userId
      FROM ml_model_approval_reviews
      WHERE import_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [importId, limit],
  );
};
