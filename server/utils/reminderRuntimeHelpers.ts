import moment from "jalali-moment";
import {
  allAsync,
  getAsync,
  runAsync,
  getOverdueInstallmentsFromDb,
  getPendingInstallmentChecksWithCustomer,
} from "../database";
import { parseAnyDate } from "./customerTelegramNotifications";

export type ReminderMatchType = "days_until" | "overdue_days";
export type ReminderChannel = "telegram" | "sms";
export type ReminderTargetType = "both" | "installment" | "check";

export type ReminderRuleRow = {
  id: number;
  name: string;
  enabled: number;
  channel: ReminderChannel;
  matchType: ReminderMatchType;
  value: number;
  template: string;
  installmentTemplate?: string;
  checkTemplate?: string;
  targetType?: ReminderTargetType;
  createdAt: string;
  updatedAt: string;
  matchedCount?: number;
};

export type ReminderConfigRow = {
  id: number;
  sendStartHour: number;
  sendEndHour: number;
  maxPerDayPerCustomer: number;
  timezone: string;
};

export const ensureReminderRulesTables = async () => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS reminder_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      sendStartHour INTEGER NOT NULL DEFAULT 10,
      sendEndHour INTEGER NOT NULL DEFAULT 21,
      maxPerDayPerCustomer INTEGER NOT NULL DEFAULT 1,
      timezone TEXT NOT NULL DEFAULT 'Asia/Tehran',
      updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'))
    );
  `);
  await runAsync(`INSERT OR IGNORE INTO reminder_config (id) VALUES (1);`);
  await runAsync(`
    CREATE TABLE IF NOT EXISTS reminder_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      channel TEXT NOT NULL DEFAULT 'telegram',
      matchType TEXT NOT NULL,
      value INTEGER NOT NULL,
      template TEXT NOT NULL,
      installmentTemplate TEXT,
      checkTemplate TEXT,
      targetType TEXT NOT NULL DEFAULT 'both',
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'))
    );
  `);
  try {
    const cols: any[] = await allAsync(
      `PRAGMA table_info(reminder_rules)`,
    ).catch(() => []);
    const has = (name: string) =>
      cols.some(
        (c: any) => String(c?.name || "").toLowerCase() === name.toLowerCase(),
      );
    if (!has("installmentTemplate"))
      await runAsync(
        `ALTER TABLE reminder_rules ADD COLUMN installmentTemplate TEXT`,
      ).catch(() => {});
    if (!has("checkTemplate"))
      await runAsync(
        `ALTER TABLE reminder_rules ADD COLUMN checkTemplate TEXT`,
      ).catch(() => {});
    if (!has("targetType"))
      await runAsync(
        `ALTER TABLE reminder_rules ADD COLUMN targetType TEXT NOT NULL DEFAULT 'both'`,
      ).catch(() => {});
  } catch {}
  // Daily cap log (successful sends)
  await runAsync(`
    CREATE TABLE IF NOT EXISTS reminder_daily_cap (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dayKey TEXT NOT NULL,
      channel TEXT NOT NULL,
      customerId INTEGER NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      UNIQUE(dayKey, channel, customerId)
    );
  `);
};

export const getReminderConfig = async (): Promise<ReminderConfigRow> => {
  const row = await getAsync(
    `SELECT * FROM reminder_config WHERE id=1 LIMIT 1`,
    [],
  ).catch(() => null);
  return {
    id: 1,
    sendStartHour: Number(row?.sendStartHour ?? 10),
    sendEndHour: Number(row?.sendEndHour ?? 21),
    maxPerDayPerCustomer: Math.max(1, Number(row?.maxPerDayPerCustomer ?? 1)),
    timezone: String(row?.timezone || "Asia/Tehran"),
  };
};

export const getReminderRules = async (): Promise<ReminderRuleRow[]> => {
  const rows = await allAsync(
    `SELECT * FROM reminder_rules ORDER BY id DESC`,
    [],
  ).catch(() => []);
  return (rows || []) as any;
};

export const getEnabledReminderRules = async (
  channel: ReminderChannel,
): Promise<ReminderRuleRow[]> => {
  const rows = await allAsync(
    `SELECT * FROM reminder_rules WHERE enabled=1 AND channel=? ORDER BY id ASC`,
    [channel],
  ).catch(() => []);
  return (rows || []) as any;
};

export const normalizeReminderTargetType = (value: any): ReminderTargetType => {
  const v = String(value || "").trim();
  if (v === "installment" || v === "check" || v === "both")
    return v as ReminderTargetType;
  return "both";
};

export const reminderTargetsInstallments = (
  rule: Pick<ReminderRuleRow, "targetType">,
) => normalizeReminderTargetType((rule as any).targetType) !== "check";

export const reminderTargetsChecks = (rule: Pick<ReminderRuleRow, "targetType">) =>
  normalizeReminderTargetType((rule as any).targetType) !== "installment";

export const countRuleMatches = async (
  rule: Pick<ReminderRuleRow, "matchType" | "value" | "targetType">,
): Promise<number> => {
  const now = moment();
  const today = now.clone().startOf("day");
  const allUnpaid = await getOverdueInstallmentsFromDb();
  const allChecks = await getPendingInstallmentChecksWithCustomer().catch(
    () => [],
  );
  const matchedCustomerIds = new Set<number>();
  const scanDueItems = (items: any[] | undefined) => {
    for (const item of items || []) {
      const due = parseAnyDate(item?.dueDate);
      if (!due) continue;
      const daysUntil = due.clone().startOf("day").diff(today, "days");
      const matched =
        rule.matchType === "days_until"
          ? Number(daysUntil) === Number(rule.value)
          : Number(daysUntil) === -Math.abs(Number(rule.value));
      if (!matched) continue;
      const customerId = Number(item?.customerId || 0);
      if (customerId > 0) matchedCustomerIds.add(customerId);
    }
  };
  if (reminderTargetsInstallments(rule as any))
    scanDueItems(allUnpaid as any[]);
  if (reminderTargetsChecks(rule as any)) scanDueItems(allChecks as any[]);
  return matchedCustomerIds.size;
};

// Store dayKey in UTC to match createdAt timestamps (which are saved in UTC).
const getDayKeyUtc = () => moment().utc().format("YYYY-MM-DD");

export const hasCustomerDailyCap = async (
  channel: ReminderChannel,
  customerId: number,
) => {
  const dayKey = getDayKeyUtc();
  const row = await getAsync(
    `SELECT 1 as ok FROM reminder_daily_cap WHERE dayKey=? AND channel=? AND customerId=? LIMIT 1`,
    [dayKey, channel, customerId],
  ).catch(() => null);
  return !!row;
};

export const hasPendingCustomerCapInOutbox = async (
  channel: ReminderChannel,
  customerId: number,
) => {
  // Prevent enqueue spam before success is logged.
  const dayKey = getDayKeyUtc();
  const row = await getAsync(
    `SELECT 1 as ok
       FROM notification_outbox
      WHERE channel=?
        AND status IN ('pending','processing')
        AND createdAt >= ?
        AND IFNULL(capCustomerId,0)=?
      LIMIT 1`,
    [channel, `${dayKey}T00:00:00Z`, customerId],
  ).catch(() => null);
  return !!row;
};
