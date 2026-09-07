import { createHash } from "node:crypto";
import { allAsync, getAsync, runAsync } from "../../database";
import type { PredictiveBrainData, PredictiveOutcomeStatus } from "./predictiveTypes";
import { recordPredictiveFeatureSnapshots } from "../featureSnapshots/featureSnapshot.service";
import type { SqliteBindValue } from "../../db/query";


const PREDICTIVE_RUN_DEDUPE_WINDOW_SECONDS = 90;

const stableJson = (value: unknown): string => {
  const normalize = (input: unknown): unknown => {
    if (Array.isArray(input)) return input.map(normalize);
    if (input && typeof input === "object") {
      return Object.keys(input as Record<string, unknown>)
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = normalize((input as Record<string, unknown>)[key]);
          return acc;
        }, {});
    }
    return input;
  };
  return JSON.stringify(normalize(value ?? null));
};

const buildPredictiveRunFingerprint = (
  data: PredictiveBrainData,
  query: Record<string, unknown>,
): string => {
  const fingerprintPayload = {
    query,
    from: data.from,
    to: data.to,
    horizon: data.horizon,
    confidence: data.confidence,
    forecast: data.forecast,
    risks: {
      stockout: (data.risks?.stockout || []).map((risk) => ({
        productId: risk.productId,
        stockQuantity: risk.stockQuantity,
        thresholdQty: risk.thresholdQty,
        soldQty14: risk.soldQty14,
        daysToStockout: risk.daysToStockout,
        suggestedBuyQty: risk.suggestedBuyQty,
        severity: risk.severity,
      })),
      collection: data.risks?.collection,
    },
    alerts: (data.alerts || []).map((alert) => ({
      id: alert.id,
      severity: alert.severity,
      title: alert.title,
      targetPath: alert.to,
    })),
    method: data.method,
  };
  return createHash("sha256")
    .update(stableJson(fingerprintPayload))
    .digest("hex");
};

const clampLimit = (value: unknown, fallback = 50, max = 500): number => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.max(1, Math.min(max, Math.round(n)));
};

const safeJson = (value: unknown): string => {
  try {
    return JSON.stringify(value ?? null);
  } catch (_err) {
    return JSON.stringify({ serializationError: true });
  }
};

const normalizeOptionalText = (value: unknown, maxLength = 1000): string | null => {
  const text = String(value ?? "").trim();
  return text ? text.slice(0, maxLength) : null;
};

const normalizeOptionalNumber = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

export const normalizePredictiveOutcomeStatus = (
  value: unknown,
): PredictiveOutcomeStatus => {
  const raw = String(value ?? "").trim().toLowerCase();
  if (["hit", "miss", "partial", "neutral", "pending", "unknown", "skipped", "insufficient_data", "failed"].includes(raw)) {
    return raw as PredictiveOutcomeStatus;
  }
  if (["positive", "success", "true"].includes(raw)) return "hit";
  if (["negative", "failed", "failure", "false"].includes(raw)) return "miss";
  return "unknown";
};

export const recordPredictiveRun = async (
  data: PredictiveBrainData,
  query: Record<string, unknown>,
  userId?: number | null,
): Promise<{ runId: number; runKey: string; deduplicated: boolean }> => {
  const runFingerprint = buildPredictiveRunFingerprint(data, query);
  await runAsync("BEGIN IMMEDIATE TRANSACTION");

  try {
    const existingRun = await getAsync(
      `
        SELECT id, runKey, requestCount
        FROM predictive_engine_runs
        WHERE runFingerprint = ?
          AND createdAt >= strftime('%Y-%m-%dT%H:%M:%SZ', 'now', ? || ' seconds', 'utc')
        ORDER BY createdAt DESC, id DESC
        LIMIT 1
      `,
      [runFingerprint, `-${PREDICTIVE_RUN_DEDUPE_WINDOW_SECONDS}`],
    );

    if (existingRun?.id && existingRun?.runKey) {
      await runAsync(
        `
          UPDATE predictive_engine_runs
          SET requestCount = COALESCE(requestCount, 1) + 1,
              lastSeenAt = strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'),
              updatedAt = strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')
          WHERE id = ?
        `,
        [existingRun.id],
      );
      await runAsync("COMMIT");
      return {
        runId: Number(existingRun.id),
        runKey: String(existingRun.runKey),
        deduplicated: true,
      };
    }

    const runKey = `predictive-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const result = await runAsync(
      `
        INSERT INTO predictive_engine_runs (
          runKey, runFingerprint, fromDate, toDate, horizonTomorrow, horizonNext7DaysUntil,
          confidence, tomorrowSalesForecast, next7SalesForecast, tomorrowOrdersForecast,
          avgTicket, trendPct, discountPressure, stockoutRiskCount,
          collectionOverdueCount, collectionOverdueAmount, collectionDueSoonCount,
          collectionDueSoonAmount, alertCount, methodLabel, methodDataPoints,
          methodWarning, payloadJson, queryJson, userId, requestCount, lastSeenAt,
          evaluationStatus, modelKey, modelVersion
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'), ?, ?, ?)
      `,
      [
        runKey,
        runFingerprint,
        data.from,
        data.to,
        data.horizon?.tomorrow || null,
        data.horizon?.next7DaysUntil || null,
        Number(data.confidence || 0),
        Number(data.forecast?.tomorrowSales || 0),
        Number(data.forecast?.next7Sales || 0),
        Number(data.forecast?.tomorrowOrders || 0),
        Number(data.forecast?.avgTicket || 0),
        Number(data.forecast?.trendPct || 0),
        Number(data.forecast?.discountPressure || 0),
        Array.isArray(data.risks?.stockout) ? data.risks.stockout.length : 0,
        Number(data.risks?.collection?.overdueCount || 0),
        Number(data.risks?.collection?.overdueAmount || 0),
        Number(data.risks?.collection?.dueSoonCount || 0),
        Number(data.risks?.collection?.dueSoonAmount || 0),
        Array.isArray(data.alerts) ? data.alerts.length : 0,
        data.method?.label || null,
        Number(data.method?.dataPoints || 0),
        data.method?.warning || null,
        safeJson(data),
        safeJson(query),
        userId || null,
        "pending",
        "rule_statistical_baseline",
        "v1",
      ],
    );
    const runId = Number(result.lastID || 0);

    for (const alert of data.alerts || []) {
      await runAsync(
        `
          INSERT INTO predictive_alert_logs (
            runId, alertId, severity, title, summary, actionLabel, targetPath
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          runId,
          alert.id || null,
          alert.severity || null,
          alert.title || null,
          alert.summary || null,
          alert.actionLabel || null,
          alert.to || null,
        ],
      );
    }

    await recordPredictiveFeatureSnapshots(runId, data);

    await runAsync("COMMIT");
    return { runId, runKey, deduplicated: false };
  } catch (err) {
    await runAsync("ROLLBACK").catch(() => undefined);
    throw err;
  }
};

export const listPredictiveRuns = async (query: Record<string, unknown>) => {
  const limit = clampLimit(query.limit, 50, 500);
  const status = normalizeOptionalText(query.status, 40);
  const from = normalizeOptionalText(query.from || query.fromDate, 40);
  const to = normalizeOptionalText(query.to || query.toDate, 40);
  const params: SqliteBindValue[] = [];
  const clauses: string[] = [];

  if (status) {
    clauses.push("status = ?");
    params.push(status);
  }
  if (from) {
    clauses.push("substr(createdAt, 1, 10) >= ?");
    params.push(from.slice(0, 10));
  }
  if (to) {
    clauses.push("substr(createdAt, 1, 10) <= ?");
    params.push(to.slice(0, 10));
  }

  params.push(limit);
  return allAsync(
    `
      SELECT id, runKey, fromDate, toDate, horizonTomorrow, horizonNext7DaysUntil,
        confidence, tomorrowSalesForecast, next7SalesForecast, tomorrowOrdersForecast,
        avgTicket, trendPct, discountPressure, stockoutRiskCount, collectionOverdueCount,
        collectionOverdueAmount, collectionDueSoonCount, collectionDueSoonAmount,
        alertCount, methodDataPoints, methodWarning, status, requestCount, lastSeenAt,
        createdAt, updatedAt, userId
      FROM predictive_engine_runs
      ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""}
      ORDER BY createdAt DESC, id DESC
      LIMIT ?
    `,
    params,
  );
};

export const getPredictiveRunDetails = async (runId: number) => {
  const run = await getAsync(
    `SELECT * FROM predictive_engine_runs WHERE id = ?`,
    [runId],
  );
  if (!run?.id) return null;
  const alerts = await allAsync(
    `SELECT * FROM predictive_alert_logs WHERE runId = ? ORDER BY createdAt ASC, id ASC`,
    [runId],
  );
  const outcomes = await allAsync(
    `SELECT * FROM predictive_outcome_events WHERE runId = ? ORDER BY createdAt DESC, id DESC`,
    [runId],
  );
  return { ...run, alerts, outcomes };
};

export const recordPredictiveOutcome = async (
  body: Record<string, unknown>,
  userId?: number | null,
) => {
  const runId = Number(body.runId || body.predictionRunId || 0);
  const alertLogId = Number(body.alertLogId || 0);
  const outcomeStatus = normalizePredictiveOutcomeStatus(body.outcomeStatus || body.outcome);
  const alertId = normalizeOptionalText(body.alertId, 120);
  const note = normalizeOptionalText(body.note, 1000);
  const evidenceJson = body.evidence === undefined ? null : safeJson(body.evidence);
  const evaluatedAt = normalizeOptionalText(body.evaluatedAt, 80);

  if (!runId && !alertLogId) {
    throw new Error("شناسه run یا alert برای ثبت نتیجه پیش‌بینی الزامی است.");
  }

  const result = await runAsync(
    `
      INSERT INTO predictive_outcome_events (
        runId, alertLogId, alertId, outcomeStatus, actualSales, actualOrders,
        actualStockoutCount, actualCollectionAmount, actualValue, note,
        evidenceJson, evaluatedAt, userId
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')), ?)
    `,
    [
      runId || null,
      alertLogId || null,
      alertId,
      outcomeStatus,
      normalizeOptionalNumber(body.actualSales),
      normalizeOptionalNumber(body.actualOrders),
      normalizeOptionalNumber(body.actualStockoutCount),
      normalizeOptionalNumber(body.actualCollectionAmount),
      normalizeOptionalNumber(body.actualValue),
      note,
      evidenceJson,
      evaluatedAt,
      userId || null,
    ],
  );

  if (alertLogId) {
    await runAsync(
      `
        UPDATE predictive_alert_logs
        SET outcomeStatus = ?, updatedAt = strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')
        WHERE id = ?
      `,
      [outcomeStatus, alertLogId],
    );
  }

  if (runId) {
    await runAsync(
      `
        UPDATE predictive_engine_runs
        SET status = CASE WHEN ? IN ('hit', 'miss', 'partial', 'neutral') THEN 'evaluated' ELSE status END,
            updatedAt = strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')
        WHERE id = ?
      `,
      [outcomeStatus, runId],
    );
  }

  const outcome = await getAsync(
    `SELECT * FROM predictive_outcome_events WHERE id = ?`,
    [result.lastID],
  );
  return outcome;
};

export const buildPredictiveOutcomeSummary = async (query: Record<string, unknown>) => {
  const limit = clampLimit(query.limit, 20, 100);
  const totals = await getAsync(
    `
      SELECT COUNT(*) AS totalEvents,
        SUM(CASE WHEN outcomeStatus = 'hit' THEN 1 ELSE 0 END) AS hitCount,
        SUM(CASE WHEN outcomeStatus = 'miss' THEN 1 ELSE 0 END) AS missCount,
        SUM(CASE WHEN outcomeStatus = 'partial' THEN 1 ELSE 0 END) AS partialCount,
        SUM(CASE WHEN outcomeStatus = 'neutral' THEN 1 ELSE 0 END) AS neutralCount,
        AVG(CASE WHEN outcomeStatus = 'hit' THEN 100 WHEN outcomeStatus = 'partial' THEN 60 WHEN outcomeStatus = 'neutral' THEN 50 WHEN outcomeStatus = 'miss' THEN 0 ELSE NULL END) AS outcomeScore
      FROM predictive_outcome_events
    `,
  );
  const recent = await allAsync(
    `
      SELECT poe.*, per.fromDate, per.toDate, per.confidence, per.tomorrowSalesForecast,
        per.next7SalesForecast, per.createdAt AS predictionCreatedAt
      FROM predictive_outcome_events poe
      LEFT JOIN predictive_engine_runs per ON per.id = poe.runId
      ORDER BY poe.createdAt DESC, poe.id DESC
      LIMIT ?
    `,
    [limit],
  );
  const openRuns = await getAsync(
    `
      SELECT COUNT(*) AS pendingRuns
      FROM predictive_engine_runs
      WHERE status = 'generated'
    `,
  );
  return {
    totals: {
      totalEvents: Number(totals?.totalEvents || 0),
      hitCount: Number(totals?.hitCount || 0),
      missCount: Number(totals?.missCount || 0),
      partialCount: Number(totals?.partialCount || 0),
      neutralCount: Number(totals?.neutralCount || 0),
      outcomeScore: Number(totals?.outcomeScore || 0),
      pendingRuns: Number(openRuns?.pendingRuns || 0),
    },
    recent,
  };
};
