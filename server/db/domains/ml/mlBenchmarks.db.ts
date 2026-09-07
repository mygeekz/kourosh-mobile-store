import { allAsync, getAsync, runAsync } from "../../query";
import { clampLimit, safeJson } from "./mlDbUtils";

export const recordMlBaselineBenchmark = async (payload: {
  benchmarkKey: string;
  datasetKey: string;
  datasetVersion: string;
  splitKey: string;
  splitStrategy: string;
  seed: string;
  testRatio: number;
  trainRows: number;
  testRows: number;
  bestCandidateKey?: string | null;
  bestF1Pct?: number | null;
  bestBalancedAccuracyPct?: number | null;
  metrics?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  userId?: number | null;
}) => {
  const result = await runAsync(
    `
      INSERT INTO ml_baseline_benchmarks (
        benchmark_key, dataset_key, dataset_version, split_key, split_strategy,
        seed, test_ratio, train_rows, test_rows, best_candidate_key,
        best_f1_pct, best_balanced_accuracy_pct, metrics_json, summary_json, user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.benchmarkKey,
      payload.datasetKey,
      payload.datasetVersion,
      payload.splitKey,
      payload.splitStrategy,
      payload.seed,
      payload.testRatio,
      payload.trainRows,
      payload.testRows,
      payload.bestCandidateKey || null,
      payload.bestF1Pct ?? null,
      payload.bestBalancedAccuracyPct ?? null,
      safeJson(payload.metrics || {}),
      safeJson(payload.summary || {}),
      payload.userId || null,
    ],
  );
  return getAsync(`SELECT * FROM ml_baseline_benchmarks WHERE id = ?`, [result.lastID]);
};

export const listMlBaselineBenchmarks = async (limitInput?: unknown) => {
  const limit = clampLimit(limitInput, 10, 100);
  return allAsync(
    `
      SELECT id, benchmark_key AS benchmarkKey, dataset_key AS datasetKey,
             dataset_version AS datasetVersion, split_key AS splitKey,
             split_strategy AS splitStrategy, seed, test_ratio AS testRatio,
             train_rows AS trainRows, test_rows AS testRows,
             best_candidate_key AS bestCandidateKey, best_f1_pct AS bestF1Pct,
             best_balanced_accuracy_pct AS bestBalancedAccuracyPct,
             created_at AS createdAt, user_id AS userId
      FROM ml_baseline_benchmarks
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [limit],
  );
};
