// Extracted from server/db/core/initRuntime.ts. Preserve SQL/order exactly.
import { runAsync } from "../query";

export const createMessagesSchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS dismissed_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      notificationId TEXT NOT NULL,
      dismissedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      UNIQUE(userId, notificationId)
    );
  `);
  console.log("Dismissed_notifications table ensured.");

  await runAsync(`
    CREATE TABLE IF NOT EXISTS sms_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      createdByUserId INTEGER,
      createdByUsername TEXT,
      provider TEXT NOT NULL,
      eventType TEXT, -- e.g. INSTALLMENT_COMPLETED / TEST_PATTERN
      entityType TEXT, -- e.g. installment_sale / repair / invoice
      entityId INTEGER,
      recipient TEXT NOT NULL,
      patternId TEXT, -- bodyId/template/patternCode
      tokensJson TEXT, -- JSON array of strings
      success INTEGER NOT NULL DEFAULT 0,
      responseJson TEXT,
      errorText TEXT
    );
  `);
  console.log("Sms_logs table ensured.");

  // ---- SMS Logs schema migrations (non-breaking) ----
  // Older DBs may miss newer columns; add them safely.
  const addCol = async (name: string, decl: string): Promise<void> => {
    try {
      // SQLite: adding an existing column throws; we ignore.
      await runAsync(`ALTER TABLE sms_logs ADD COLUMN ${name} ${decl}`);
    } catch {}
  };

  await addCol("error", "TEXT");
  await addCol("relatedLogId", "INTEGER");
  await addCol("requestJson", "TEXT");
  await addCol("httpStatus", "INTEGER");
  await addCol("rawResponseText", "TEXT");
  await addCol("durationMs", "INTEGER");
  await addCol("correlationId", "TEXT");
};
