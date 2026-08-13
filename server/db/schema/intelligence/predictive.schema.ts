import { runAsync } from "../../query";
import { ensureColumn } from "./shared";

export const createPredictiveSchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS predictive_engine_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      runKey TEXT UNIQUE,
      runFingerprint TEXT,
      duplicateOfRunId INTEGER,
      requestCount INTEGER DEFAULT 1,
      lastSeenAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      fromDate TEXT,
      toDate TEXT,
      horizonTomorrow TEXT,
      horizonNext7DaysUntil TEXT,
      confidence REAL DEFAULT 0,
      tomorrowSalesForecast REAL DEFAULT 0,
      next7SalesForecast REAL DEFAULT 0,
      tomorrowOrdersForecast INTEGER DEFAULT 0,
      avgTicket REAL DEFAULT 0,
      trendPct REAL DEFAULT 0,
      discountPressure REAL DEFAULT 0,
      stockoutRiskCount INTEGER DEFAULT 0,
      collectionOverdueCount INTEGER DEFAULT 0,
      collectionOverdueAmount REAL DEFAULT 0,
      collectionDueSoonCount INTEGER DEFAULT 0,
      collectionDueSoonAmount REAL DEFAULT 0,
      alertCount INTEGER DEFAULT 0,
      methodLabel TEXT,
      methodDataPoints INTEGER DEFAULT 0,
      methodWarning TEXT,
      payloadJson TEXT,
      queryJson TEXT,
      status TEXT DEFAULT 'generated',
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      userId INTEGER,
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (duplicateOfRunId) REFERENCES predictive_engine_runs(id)
    );
  `);

  await ensureColumn(
    "predictive_engine_runs",
    "runFingerprint",
    `ALTER TABLE predictive_engine_runs ADD COLUMN runFingerprint TEXT`,
  );

  await ensureColumn(
    "predictive_engine_runs",
    "duplicateOfRunId",
    `ALTER TABLE predictive_engine_runs ADD COLUMN duplicateOfRunId INTEGER`,
  );

  await ensureColumn(
    "predictive_engine_runs",
    "requestCount",
    `ALTER TABLE predictive_engine_runs ADD COLUMN requestCount INTEGER DEFAULT 1`,
  );

  await ensureColumn(
    "predictive_engine_runs",
    "lastSeenAt",
    `ALTER TABLE predictive_engine_runs ADD COLUMN lastSeenAt TEXT`,
  );

  await ensureColumn(
    "predictive_engine_runs",
    "evaluationStatus",
    `ALTER TABLE predictive_engine_runs ADD COLUMN evaluationStatus TEXT DEFAULT 'pending'`,
  );

  await ensureColumn(
    "predictive_engine_runs",
    "modelKey",
    `ALTER TABLE predictive_engine_runs ADD COLUMN modelKey TEXT DEFAULT 'rule_statistical_baseline'`,
  );

  await ensureColumn(
    "predictive_engine_runs",
    "modelVersion",
    `ALTER TABLE predictive_engine_runs ADD COLUMN modelVersion TEXT DEFAULT 'v1'`,
  );

  await runAsync(`
    CREATE TABLE IF NOT EXISTS predictive_alert_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      runId INTEGER NOT NULL,
      alertId TEXT,
      severity TEXT,
      title TEXT,
      summary TEXT,
      actionLabel TEXT,
      targetPath TEXT,
      outcomeStatus TEXT DEFAULT 'pending',
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      FOREIGN KEY (runId) REFERENCES predictive_engine_runs(id) ON DELETE CASCADE
    );
  `);

  await runAsync(`
    CREATE TABLE IF NOT EXISTS predictive_outcome_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      runId INTEGER,
      alertLogId INTEGER,
      alertId TEXT,
      outcomeStatus TEXT NOT NULL DEFAULT 'unknown',
      actualSales REAL,
      actualOrders INTEGER,
      actualStockoutCount INTEGER,
      actualCollectionAmount REAL,
      actualValue REAL,
      note TEXT,
      evidenceJson TEXT,
      evaluatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      userId INTEGER,
      FOREIGN KEY (runId) REFERENCES predictive_engine_runs(id) ON DELETE SET NULL,
      FOREIGN KEY (alertLogId) REFERENCES predictive_alert_logs(id) ON DELETE SET NULL,
      FOREIGN KEY (userId) REFERENCES users(id)
    );
  `);

  await ensureColumn(
    "predictive_outcome_events",
    "predictionType",
    `ALTER TABLE predictive_outcome_events ADD COLUMN predictionType TEXT`,
  );

  await ensureColumn(
    "predictive_outcome_events",
    "predictedValue",
    `ALTER TABLE predictive_outcome_events ADD COLUMN predictedValue REAL`,
  );

  await ensureColumn(
    "predictive_outcome_events",
    "absoluteError",
    `ALTER TABLE predictive_outcome_events ADD COLUMN absoluteError REAL`,
  );

  await ensureColumn(
    "predictive_outcome_events",
    "percentageError",
    `ALTER TABLE predictive_outcome_events ADD COLUMN percentageError REAL`,
  );

  await ensureColumn(
    "predictive_outcome_events",
    "accuracyPct",
    `ALTER TABLE predictive_outcome_events ADD COLUMN accuracyPct REAL`,
  );

  await ensureColumn(
    "predictive_outcome_events",
    "horizonDays",
    `ALTER TABLE predictive_outcome_events ADD COLUMN horizonDays INTEGER`,
  );

  await ensureColumn(
    "predictive_outcome_events",
    "metricsJson",
    `ALTER TABLE predictive_outcome_events ADD COLUMN metricsJson TEXT`,
  );

  await runAsync(`
    CREATE TABLE IF NOT EXISTS predictive_feature_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id INTEGER NOT NULL,
      model_key TEXT NOT NULL DEFAULT 'rule_statistical_baseline',
      model_version TEXT NOT NULL DEFAULT 'v1',
      prediction_type TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      horizon_days INTEGER,
      features_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      FOREIGN KEY (run_id) REFERENCES predictive_engine_runs(id) ON DELETE CASCADE
    );
  `);

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_predictive_engine_runs_created_at ON predictive_engine_runs(createdAt)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_predictive_engine_runs_fingerprint_recent ON predictive_engine_runs(runFingerprint, createdAt)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_predictive_engine_runs_status ON predictive_engine_runs(status, createdAt)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_predictive_alert_logs_run ON predictive_alert_logs(runId, createdAt)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_predictive_alert_logs_outcome ON predictive_alert_logs(outcomeStatus, createdAt)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_predictive_outcome_events_run ON predictive_outcome_events(runId, createdAt)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_predictive_outcome_events_status ON predictive_outcome_events(outcomeStatus, createdAt)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_predictive_runs_evaluation_status ON predictive_engine_runs(evaluationStatus, horizonNext7DaysUntil)`,
  );

  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_predictive_outcome_events_type ON predictive_outcome_events(predictionType, evaluatedAt)`,
  );
};
