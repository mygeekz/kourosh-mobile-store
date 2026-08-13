// Report saved-filter table helper extracted from legacyRuntime in Phase 1I.

import { runAsync } from "../query";
import { getDbInstance } from "../core/runtimeBindings";
export type { SavedFilterRow } from "../core/types";

export const ensureReportSavedFiltersTable = async () => {
  await getDbInstance();
  await runAsync(`
    CREATE TABLE IF NOT EXISTS report_saved_filters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      reportKey TEXT NOT NULL,
      name TEXT NOT NULL,
      filtersJson TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      UNIQUE(userId, reportKey, name)
    );
  `);
};
