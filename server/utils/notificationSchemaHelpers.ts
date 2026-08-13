import { allAsync, runAsync } from "../database";

export const ensureNotificationOutboxTables = async () => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS notification_outbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel TEXT NOT NULL,
      provider TEXT,
      eventType TEXT,
      entityType TEXT,
      entityId INTEGER,
      recipient TEXT NOT NULL,
      payloadJson TEXT NOT NULL,
      eventKey TEXT,
      capCustomerId INTEGER,
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      maxAttempts INTEGER NOT NULL DEFAULT 6,
      nextAttemptAt TEXT,
      lastError TEXT,
      supportStatus TEXT,
      supportNote TEXT,
      supportUpdatedAt TEXT,
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'))
    );
  `);
  // Lightweight migrations for older DBs (SQLite doesn't support IF NOT EXISTS on ADD COLUMN).
  try {
    const cols = await allAsync(`PRAGMA table_info(notification_outbox)`);
    const has = (name: string) =>
      (cols || []).some((c: any) => String(c?.name) === name);
    if (!has("supportStatus"))
      await runAsync(
        `ALTER TABLE notification_outbox ADD COLUMN supportStatus TEXT`,
      ).catch(() => {});
    if (!has("supportNote"))
      await runAsync(
        `ALTER TABLE notification_outbox ADD COLUMN supportNote TEXT`,
      ).catch(() => {});
    if (!has("supportUpdatedAt"))
      await runAsync(
        `ALTER TABLE notification_outbox ADD COLUMN supportUpdatedAt TEXT`,
      ).catch(() => {});
    if (!has("eventKey"))
      await runAsync(
        `ALTER TABLE notification_outbox ADD COLUMN eventKey TEXT`,
      ).catch(() => {});
    if (!has("capCustomerId"))
      await runAsync(
        `ALTER TABLE notification_outbox ADD COLUMN capCustomerId INTEGER`,
      ).catch(() => {});
    if (!has("telegramMessageId"))
      await runAsync(
        `ALTER TABLE notification_outbox ADD COLUMN telegramMessageId INTEGER`,
      ).catch(() => {});
  } catch {
    // ignore
  }
  await runAsync(`
    CREATE TABLE IF NOT EXISTS notification_sent_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dayKey TEXT NOT NULL,
      channel TEXT NOT NULL,
      eventType TEXT,
      entityType TEXT,
      entityId INTEGER,
      recipient TEXT,
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'))
    );
  `);
  await runAsync(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_sent_dedupe
    ON notification_sent_log(dayKey, channel, eventType, entityType, entityId, recipient);
  `);
  await runAsync(`
    CREATE TABLE IF NOT EXISTS notification_event_dedupe (
      eventKey TEXT PRIMARY KEY,
      lastQueuedAt TEXT,
      lastSentAt TEXT
    );
  `);
  await runAsync(
    `CREATE INDEX IF NOT EXISTS idx_notification_event_dedupe_lastQueued ON notification_event_dedupe(lastQueuedAt);`,
  );
};

export const ensureTelegramInboxTable = async () => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS telegram_inbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chatId TEXT,
      fromId TEXT,
      kind TEXT,
      text TEXT,
      payloadJson TEXT,
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'))
    );
  `);
};

export const ensureCustomerTelegramColumns = async () => {
  // Be defensive across older DB versions
  const addCol = async (sql: string) => {
    try {
      await runAsync(sql);
    } catch {}
  };
  // Some DBs already use camelCase (telegramChatId). We keep both to stay compatible.
  await addCol(`ALTER TABLE customers ADD COLUMN telegram_chat_id TEXT`);
  await addCol(`ALTER TABLE customers ADD COLUMN telegram_user_id TEXT`);
  await addCol(`ALTER TABLE customers ADD COLUMN telegram_linked_at TEXT`);
  await addCol(
    `ALTER TABLE customers ADD COLUMN telegram_opted_out INTEGER DEFAULT 0`,
  );
  // Invalid/blocked chats (auto-mark when user blocks bot)
  await addCol(
    `ALTER TABLE customers ADD COLUMN telegram_invalid INTEGER DEFAULT 0`,
  );
  await addCol(`ALTER TABLE customers ADD COLUMN telegram_invalid_reason TEXT`);
  await addCol(`ALTER TABLE customers ADD COLUMN telegram_invalid_at TEXT`);
};

export const getExistingCustomerColumns = async (): Promise<Set<string>> => {
  try {
    const cols: any[] = await allAsync(`PRAGMA table_info(customers)`);
    return new Set(
      (cols || [])
        .map((c: any) => String(c?.name || "").trim())
        .filter(Boolean),
    );
  } catch {
    return new Set();
  }
};

export const buildCustomerTelegramLinkedWhereSql = (cols: Set<string>): string => {
  const candidates = ["telegram_chat_id", "telegramChatId"].filter((c) =>
    cols.has(c),
  );
  if (!candidates.length) return `1=0`;
  const nonEmpty = candidates.map(
    (c) => `( ${c} IS NOT NULL AND TRIM(${c}) <> '' )`,
  );
  return `(${nonEmpty.join(" OR ")})`;
};

