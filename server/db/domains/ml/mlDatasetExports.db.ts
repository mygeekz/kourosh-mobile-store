import { allAsync, getAsync, runAsync } from "../../query";
import { clampLimit, safeJson } from "./mlDbUtils";

export type InventoryStockoutDatasetSnapshotRow = {
  snapshotId: number;
  runId: number;
  modelKey: string;
  modelVersion: string;
  entityId: string | null;
  horizonDays: number | null;
  featuresJson: string;
  snapshotCreatedAt: string | null;
  runCreatedAt: string | null;
  horizonTomorrow: string | null;
  horizonNext7DaysUntil: string | null;
  outcomeId: number | null;
  outcomeStatus: string | null;
  outcomeAccuracyPct: number | null;
  outcomeMetricsJson: string | null;
  evaluatedAt: string | null;
};

export const listInventoryStockoutDatasetSnapshotRows = async (options: {
  limit?: unknown;
  onlyLabeled?: boolean;
} = {}): Promise<InventoryStockoutDatasetSnapshotRow[]> => {
  const limit = clampLimit(options.limit, 1000, 10000);
  const labeledClause = options.onlyLabeled ? "AND poe.id IS NOT NULL" : "";
  return allAsync(
    `
      SELECT
        pfs.id AS snapshotId,
        pfs.run_id AS runId,
        pfs.model_key AS modelKey,
        pfs.model_version AS modelVersion,
        pfs.entity_id AS entityId,
        pfs.horizon_days AS horizonDays,
        pfs.features_json AS featuresJson,
        pfs.created_at AS snapshotCreatedAt,
        per.createdAt AS runCreatedAt,
        per.horizonTomorrow AS horizonTomorrow,
        per.horizonNext7DaysUntil AS horizonNext7DaysUntil,
        poe.id AS outcomeId,
        poe.outcomeStatus AS outcomeStatus,
        poe.accuracyPct AS outcomeAccuracyPct,
        poe.metricsJson AS outcomeMetricsJson,
        poe.evaluatedAt AS evaluatedAt
      FROM predictive_feature_snapshots pfs
      INNER JOIN predictive_engine_runs per ON per.id = pfs.run_id
      LEFT JOIN predictive_outcome_events poe
        ON poe.runId = pfs.run_id
       AND poe.predictionType = 'inventory_stockout'
      WHERE pfs.prediction_type = 'inventory_stockout'
        ${labeledClause}
      ORDER BY pfs.created_at DESC, pfs.id DESC
      LIMIT ?
    `,
    [limit],
  ) as Promise<InventoryStockoutDatasetSnapshotRow[]>;
};

export const getInventoryStockoutDatasetSourceCounts = async () => {
  return getAsync(
    `
      SELECT
        (SELECT COUNT(*) FROM predictive_feature_snapshots WHERE prediction_type = 'inventory_stockout') AS totalSnapshots,
        (SELECT COUNT(DISTINCT pfs.run_id)
           FROM predictive_feature_snapshots pfs
           WHERE pfs.prediction_type = 'inventory_stockout') AS totalRunsWithSnapshots,
        (SELECT COUNT(*) FROM predictive_outcome_events WHERE predictionType = 'inventory_stockout') AS evaluatedInventoryOutcomes
    `,
  );
};

export const recordMlDatasetExport = async (payload: {
  datasetKey: string;
  datasetVersion: string;
  exportFormat: "json" | "csv";
  rowCount: number;
  labeledRowCount: number;
  featureCount: number;
  labelKey: string;
  filters?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  userId?: number | null;
}) => {
  const result = await runAsync(
    `
      INSERT INTO ml_dataset_exports (
        dataset_key, dataset_version, export_format, row_count, labeled_row_count,
        feature_count, label_key, filters_json, summary_json, user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.datasetKey,
      payload.datasetVersion,
      payload.exportFormat,
      payload.rowCount,
      payload.labeledRowCount,
      payload.featureCount,
      payload.labelKey,
      safeJson(payload.filters || {}),
      safeJson(payload.summary || {}),
      payload.userId || null,
    ],
  );
  return getAsync(`SELECT * FROM ml_dataset_exports WHERE id = ?`, [result.lastID]);
};

export const listMlDatasetExports = async (limitInput?: unknown) => {
  const limit = clampLimit(limitInput, 10, 100);
  return allAsync(
    `
      SELECT id, dataset_key AS datasetKey, dataset_version AS datasetVersion,
             export_format AS exportFormat, row_count AS rowCount,
             labeled_row_count AS labeledRowCount, feature_count AS featureCount,
             label_key AS labelKey, created_at AS createdAt, user_id AS userId
      FROM ml_dataset_exports
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [limit],
  );
};
