import { runAsync } from "../query";

const duplicateColumn = (error: unknown): boolean =>
  /duplicate column name/i.test(String((error as any)?.message || error || ""));

const addPartnerColumn = async (sql: string): Promise<void> => {
  try {
    await runAsync(sql);
  } catch (error) {
    if (!duplicateColumn(error)) throw error;
  }
};

/** Non-destructive Telegram identity schema. Existing mappings are preserved. */
export const createTelegramIdentitySecuritySchema = async (): Promise<void> => {
  await addPartnerColumn("ALTER TABLE partners ADD COLUMN telegram_user_id TEXT");
  await addPartnerColumn("ALTER TABLE partners ADD COLUMN telegram_chat_id TEXT");

  await runAsync(`CREATE TABLE IF NOT EXISTS telegram_partner_link_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token_hash TEXT NOT NULL UNIQUE,
    partner_id INTEGER NOT NULL,
    expires_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'issued' CHECK(status IN ('issued','used','expired','rejected','canceled')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now','utc')),
    used_at TEXT, telegram_user_id TEXT, chat_id TEXT, last_error TEXT,
    FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE
  )`);
  await runAsync("CREATE INDEX IF NOT EXISTS idx_partner_link_tokens_lookup ON telegram_partner_link_tokens(token_hash,status,expires_at)");

  await runAsync(`CREATE TABLE IF NOT EXISTS telegram_staff_link_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token_hash TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    expires_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'issued' CHECK(status IN ('issued','used','expired','rejected','canceled')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now','utc')),
    used_at TEXT, telegram_user_id TEXT, chat_id TEXT, last_error TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);
  await runAsync("CREATE INDEX IF NOT EXISTS idx_staff_link_tokens_lookup ON telegram_staff_link_tokens(token_hash,status,expires_at)");

  await runAsync(`CREATE TABLE IF NOT EXISTS user_telegram_links (
    user_id INTEGER PRIMARY KEY,
    telegram_user_id TEXT NOT NULL UNIQUE,
    chat_id TEXT NOT NULL,
    linked_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now','utc')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now','utc')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);
  try {
    await runAsync("CREATE UNIQUE INDEX IF NOT EXISTS idx_partners_telegram_user_unique ON partners(telegram_user_id) WHERE telegram_user_id IS NOT NULL AND telegram_user_id != ''");
  } catch (error) {
    // Preserve legacy conflicting mappings for manual review; redemption still
    // rejects every new collision instead of rewriting historical identity data.
    if (!/unique constraint/i.test(String((error as any)?.message || error))) throw error;
    console.warn("Legacy duplicate partner Telegram identities detected; unique index deferred.");
  }
  try {
    await runAsync("CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_telegram_user_unique ON customers(telegram_user_id) WHERE telegram_user_id IS NOT NULL AND telegram_user_id != ''");
  } catch (error) {
    if (!/unique constraint/i.test(String((error as any)?.message || error))) throw error;
    console.warn("Legacy duplicate customer Telegram identities detected; unique index deferred.");
  }
};
