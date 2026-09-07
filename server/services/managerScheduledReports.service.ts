import moment from "jalali-moment";
import { getLocalTenantIdentity } from "../connectivity/localTenantIdentity";
import { resolveUserTenantAuthorization } from "../db/domains/accessControl.db";
import { allTypedAsync, getTypedAsync, runAsync } from "../db/query";
import { miniAppStaffReadModels } from "./miniAppStaffReadModels";

export type ManagerScheduledReportKey = "nightly_sales" | "morning_installments";
export type ManagerScheduledReportChannels = { inApp: boolean; telegram: boolean };
export type ManagerScheduledReportPublisher = (input: {
  userId: number;
  notificationKey: string;
  sourceEventType: string;
  text: string;
  title?: string;
  meta?: { entityType?: string; entityId?: number; data?: Record<string, unknown> };
  channels: ManagerScheduledReportChannels;
}) => Promise<{ matched?: boolean; recipients?: number; inApp?: number; telegram?: number; reason?: string }>;

type ScheduleRow = {
  id: number;
  membershipId: number;
  userId: number;
  reportKey: ManagerScheduledReportKey;
  localTime: string;
  timezone: string;
  isEnabled: number;
  channelsJson: string;
  configJson: string;
  catchUpPolicy: "catch_up" | "skip_if_old";
  maxAgeMinutes: number;
  graceMinutes: number;
  reconcileFrom: string;
  createdAt: string;
  updatedAt: string;
};

type JobRow = {
  id: number;
  scheduleId: number;
  scheduledFor: string;
  status: "scheduled" | "running" | "completed" | "failed" | "skipped";
  retryCount: number;
};

const REPORT_DEFAULTS: Record<ManagerScheduledReportKey, {
  localTime: string;
  permission: "sales.read" | "installments.read";
  channels: ManagerScheduledReportChannels;
  config: Record<string, unknown>;
  catchUpPolicy: "catch_up" | "skip_if_old";
  maxAgeMinutes: number;
  graceMinutes: number;
}> = {
  nightly_sales: {
    localTime: "23:30",
    permission: "sales.read",
    channels: { inApp: true, telegram: false },
    config: { includeProfit: true, includeAverage: true },
    catchUpPolicy: "catch_up",
    maxAgeMinutes: 720,
    graceMinutes: 20,
  },
  morning_installments: {
    localTime: "08:00",
    permission: "installments.read",
    channels: { inApp: true, telegram: false },
    config: { includeOverdue: true, windows: [0, 3, 7] },
    catchUpPolicy: "catch_up",
    maxAgeMinutes: 360,
    graceMinutes: 20,
  },
};

const parseObject = (value: unknown): Record<string, unknown> => {
  try {
    const parsed = JSON.parse(String(value || "{}"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const parseChannels = (value: unknown): ManagerScheduledReportChannels => {
  const parsed = parseObject(value);
  return { inApp: parsed.inApp !== false, telegram: parsed.telegram === true };
};

const normalizeChannels = (value: unknown): string => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("MANAGER_REPORT_CHANNELS_INVALID");
  const source = value as Record<string, unknown>;
  return JSON.stringify({ inApp: source.inApp !== false, telegram: source.telegram === true });
};

const normalizeConfig = (reportKey: ManagerScheduledReportKey, value: unknown): string => {
  if (value == null) return JSON.stringify(REPORT_DEFAULTS[reportKey].config);
  if (typeof value !== "object" || Array.isArray(value)) throw new Error("MANAGER_REPORT_CONFIG_INVALID");
  const source = value as Record<string, unknown>;
  if (reportKey === "nightly_sales") {
    return JSON.stringify({
      includeProfit: source.includeProfit !== false,
      includeAverage: source.includeAverage !== false,
    });
  }
  const windows = Array.isArray(source.windows)
    ? [...new Set(source.windows.map(Number).filter((item) => [0, 3, 7].includes(item)))]
    : [0, 3, 7];
  // An explicit empty list is meaningful in Stage 7: the manager may want only the overdue bucket.
  // Preserve it instead of silently restoring all windows.
  return JSON.stringify({ includeOverdue: source.includeOverdue !== false, windows });
};

const assertTimezone = (timezone: string): string => {
  const normalized = String(timezone || "").trim();
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: normalized }).format(new Date());
  } catch {
    throw new Error("MANAGER_REPORT_TIMEZONE_INVALID");
  }
  return normalized;
};

const assertLocalTime = (value: unknown): string => {
  const normalized = String(value || "").trim();
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(normalized)) throw new Error("MANAGER_REPORT_TIME_INVALID");
  return normalized;
};

const zonedParts = (date: Date, timezone: string) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value || 0);
  return { year: value("year"), month: value("month"), day: value("day"), hour: value("hour"), minute: value("minute"), second: value("second") };
};

const dateKeyFor = (date: Date, timezone: string): string => {
  const part = zonedParts(date, timezone);
  return `${part.year}-${String(part.month).padStart(2, "0")}-${String(part.day).padStart(2, "0")}`;
};

const addDateKeyDays = (dateKey: string, days: number): string => {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
};

const compareDateKeys = (left: string, right: string): number => left.localeCompare(right);

const zonedLocalToUtc = (dateKey: string, localTime: string, timezone: string): Date => {
  const [year, month, day] = dateKey.split("-").map(Number);
  const [hour, minute] = localTime.split(":").map(Number);
  const desiredAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  let guess = desiredAsUtc;
  for (let index = 0; index < 4; index += 1) {
    const current = zonedParts(new Date(guess), timezone);
    const currentAsUtc = Date.UTC(current.year, current.month - 1, current.day, current.hour, current.minute, current.second);
    const delta = desiredAsUtc - currentAsUtc;
    if (Math.abs(delta) < 1000) break;
    guess += delta;
  }
  return new Date(guess);
};

const defaultTimezone = async (): Promise<string> => {
  const row = await getTypedAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key IN ('report_scheduler_timezone','backup_timezone','app_timezone') ORDER BY CASE key WHEN 'report_scheduler_timezone' THEN 1 WHEN 'backup_timezone' THEN 2 ELSE 3 END LIMIT 1",
  ).catch(() => undefined);
  const candidate = String(row?.value || "Asia/Tehran").trim() || "Asia/Tehran";
  try { return assertTimezone(candidate); } catch { return "Asia/Tehran"; }
};

export const ensureDefaultManagerReportSchedules = async (): Promise<void> => {
  const { tenantId } = await getLocalTenantIdentity();
  const timezone = await defaultTimezone();
  for (const reportKey of Object.keys(REPORT_DEFAULTS) as ManagerScheduledReportKey[]) {
    const definition = REPORT_DEFAULTS[reportKey];
    const memberships = await allTypedAsync<{ membershipId: number }>(
      `SELECT DISTINCT m.id AS membershipId
         FROM tenant_memberships m
         JOIN tenant_membership_roles mr ON mr.membership_id=m.id
         JOIN access_roles r ON r.id=mr.role_id AND r.tenant_id=m.tenant_id
         JOIN access_role_permissions rp ON rp.role_id=r.id
        WHERE m.tenant_id=? AND m.status='active' AND rp.permission_key=?`,
      [tenantId, definition.permission],
    );
    for (const membership of memberships) {
      await runAsync(
        `INSERT OR IGNORE INTO manager_report_schedules(
          tenant_membership_id,report_key,local_time,timezone,is_enabled,channels_json,config_json,catch_up_policy,max_age_minutes,grace_minutes
        ) VALUES(?,?,?,?,1,?,?,?,?,?)`,
        [membership.membershipId, reportKey, definition.localTime, timezone, JSON.stringify(definition.channels), JSON.stringify(definition.config), definition.catchUpPolicy, definition.maxAgeMinutes, definition.graceMinutes],
      );
    }
  }
};

const requireTargetAuthorization = async (userId: number) => {
  const authorization = await resolveUserTenantAuthorization(userId);
  if (!authorization) throw new Error("MANAGER_REPORT_TARGET_FORBIDDEN");
  return authorization;
};

export const listManagerReportSchedules = async (userId: number) => {
  await ensureDefaultManagerReportSchedules();
  const authorization = await requireTargetAuthorization(userId);
  const rows = await allTypedAsync<ScheduleRow>(
    `SELECT s.id,s.tenant_membership_id AS membershipId,m.user_id AS userId,s.report_key AS reportKey,
            s.local_time AS localTime,s.timezone,s.is_enabled AS isEnabled,s.channels_json AS channelsJson,
            s.config_json AS configJson,s.catch_up_policy AS catchUpPolicy,s.max_age_minutes AS maxAgeMinutes,
            s.grace_minutes AS graceMinutes,s.reconcile_from AS reconcileFrom,s.created_at AS createdAt,s.updated_at AS updatedAt
       FROM manager_report_schedules s
       JOIN tenant_memberships m ON m.id=s.tenant_membership_id
      WHERE s.tenant_membership_id=? ORDER BY s.report_key ASC`,
    [authorization.membershipId],
  );
  return rows.map((row) => ({
    id: row.id,
    reportKey: row.reportKey,
    localTime: row.localTime,
    timezone: row.timezone,
    enabled: Boolean(row.isEnabled),
    channels: parseChannels(row.channelsJson),
    config: parseObject(row.configJson),
    catchUpPolicy: row.catchUpPolicy,
    maxAgeMinutes: row.maxAgeMinutes,
    graceMinutes: row.graceMinutes,
    updatedAt: row.updatedAt,
  }));
};

export const updateManagerReportSchedule = async (
  userId: number,
  reportKey: ManagerScheduledReportKey,
  patch: Record<string, unknown>,
  updatedByUserId: number,
) => {
  if (!(reportKey in REPORT_DEFAULTS)) throw new Error("MANAGER_REPORT_KEY_INVALID");
  await ensureDefaultManagerReportSchedules();
  const authorization = await requireTargetAuthorization(userId);
  const requiredPermission = REPORT_DEFAULTS[reportKey].permission;
  if (!authorization.permissions.includes(requiredPermission)) throw new Error("MANAGER_REPORT_TARGET_FORBIDDEN");
  const existing = await getTypedAsync<ScheduleRow>(
    `SELECT s.id,s.tenant_membership_id AS membershipId,m.user_id AS userId,s.report_key AS reportKey,
            s.local_time AS localTime,s.timezone,s.is_enabled AS isEnabled,s.channels_json AS channelsJson,
            s.config_json AS configJson,s.catch_up_policy AS catchUpPolicy,s.max_age_minutes AS maxAgeMinutes,
            s.grace_minutes AS graceMinutes,s.reconcile_from AS reconcileFrom,s.created_at AS createdAt,s.updated_at AS updatedAt
       FROM manager_report_schedules s JOIN tenant_memberships m ON m.id=s.tenant_membership_id
      WHERE s.tenant_membership_id=? AND s.report_key=? LIMIT 1`,
    [authorization.membershipId, reportKey],
  );
  if (!existing) throw new Error("MANAGER_REPORT_SCHEDULE_MISSING");

  const localTime = Object.prototype.hasOwnProperty.call(patch, "localTime") ? assertLocalTime(patch.localTime) : existing.localTime;
  const timezone = Object.prototype.hasOwnProperty.call(patch, "timezone") ? assertTimezone(String(patch.timezone || "")) : existing.timezone;
  const enabled = Object.prototype.hasOwnProperty.call(patch, "enabled") ? patch.enabled === true : Boolean(existing.isEnabled);
  const channelsJson = Object.prototype.hasOwnProperty.call(patch, "channels") ? normalizeChannels(patch.channels) : existing.channelsJson;
  const configJson = Object.prototype.hasOwnProperty.call(patch, "config") ? normalizeConfig(reportKey, patch.config) : existing.configJson;
  const catchUpPolicy = Object.prototype.hasOwnProperty.call(patch, "catchUpPolicy") ? String(patch.catchUpPolicy || "") : existing.catchUpPolicy;
  if (!['catch_up', 'skip_if_old'].includes(catchUpPolicy)) throw new Error("MANAGER_REPORT_POLICY_INVALID");
  const maxAgeMinutes = Object.prototype.hasOwnProperty.call(patch, "maxAgeMinutes") ? Number(patch.maxAgeMinutes) : existing.maxAgeMinutes;
  const graceMinutes = Object.prototype.hasOwnProperty.call(patch, "graceMinutes") ? Number(patch.graceMinutes) : existing.graceMinutes;
  if (!Number.isInteger(maxAgeMinutes) || maxAgeMinutes < 1 || maxAgeMinutes > 10080) throw new Error("MANAGER_REPORT_MAX_AGE_INVALID");
  if (!Number.isInteger(graceMinutes) || graceMinutes < 1 || graceMinutes > 1440) throw new Error("MANAGER_REPORT_GRACE_INVALID");

  await runAsync(
    `UPDATE manager_report_schedules
        SET local_time=?,timezone=?,is_enabled=?,channels_json=?,config_json=?,catch_up_policy=?,max_age_minutes=?,grace_minutes=?,
            reconcile_from=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc'),created_by_user_id=COALESCE(created_by_user_id,?),
            updated_at=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc')
      WHERE id=?`,
    [localTime, timezone, enabled ? 1 : 0, channelsJson, configJson, catchUpPolicy, maxAgeMinutes, graceMinutes, updatedByUserId || null, existing.id],
  );
  return (await listManagerReportSchedules(userId)).find((item) => item.reportKey === reportKey) || null;
};

const normalizeMoney = (value: unknown): number => Number.isFinite(Number(value)) ? Number(value) : 0;

const reportDateContext = (scheduledFor: string, timezone: string) => {
  const gregorianDate = dateKeyFor(new Date(scheduledFor), timezone);
  const day = moment(gregorianDate, "YYYY-MM-DD", true);
  const jalaliDate = day.clone().locale("en").format("jYYYY/jMM/jDD");
  return { gregorianDate, jalaliDate, day };
};

const buildNightlySalesReport = async (schedule: ScheduleRow, formatMoney: (value: unknown) => string) => {
  const authorization = await resolveUserTenantAuthorization(schedule.userId);
  if (!authorization?.permissions.includes("sales.read")) throw new Error("MANAGER_REPORT_PERMISSION_REVOKED");
  const config = parseObject(schedule.configJson);
  const { jalaliDate } = reportDateContext(schedule.reconcileFrom, schedule.timezone);
  const sales = await miniAppStaffReadModels.getSalesSummaryAndProfit(jalaliDate, jalaliDate);
  const includeProfit = config.includeProfit !== false && authorization.permissions.includes("profits.read");
  const includeAverage = config.includeAverage !== false;
  const lines = [
    `📅 <b>تاریخ:</b> ${jalaliDate}`,
    `💰 <b>فروش امروز:</b> ${formatMoney(normalizeMoney(sales.totalRevenue))}`,
    `🧾 <b>تعداد فروش:</b> ${Math.max(0, Number(sales.totalTransactions || 0))}`,
  ];
  if (includeProfit) lines.push(`📈 <b>سود ناخالص:</b> ${formatMoney(normalizeMoney(sales.grossProfit))}`);
  if (includeAverage) lines.push(`💳 <b>میانگین فروش:</b> ${formatMoney(normalizeMoney(sales.averageSaleValue))}`);
  return { title: "گزارش شبانه فروش", notificationKey: "report.sales.nightly", sourceEventType: "MANAGER_REPORT_NIGHTLY_SALES", text: `📊 <b>گزارش شبانه فروش</b>\n\n${lines.join("\n")}` };
};

const buildMorningInstallmentsReport = async (schedule: ScheduleRow, formatMoney: (value: unknown) => string) => {
  const authorization = await resolveUserTenantAuthorization(schedule.userId);
  if (!authorization?.permissions.includes("installments.read")) throw new Error("MANAGER_REPORT_PERMISSION_REVOKED");
  const config = parseObject(schedule.configJson);
  const { jalaliDate, day } = reportDateContext(schedule.reconcileFrom, schedule.timezone);
  const rows = await miniAppStaffReadModels.listUnpaidInstallments();
  const buckets = {
    overdue: { count: 0, amount: 0 },
    today: { count: 0, amount: 0 },
    next3: { count: 0, amount: 0 },
    next7: { count: 0, amount: 0 },
  };
  for (const row of rows || []) {
    const due = moment(String((row as any)?.dueDate || ""), "jYYYY/jMM/jDD", true);
    if (!due.isValid()) continue;
    const remaining = Math.max(0, normalizeMoney((row as any)?.effectiveRemaining ?? (row as any)?.amountDue ?? (row as any)?.physicalRemaining));
    if (remaining <= 0.00001) continue;
    const delta = due.clone().startOf("day").diff(day.clone().startOf("day"), "days");
    if (delta < 0) { buckets.overdue.count += 1; buckets.overdue.amount += remaining; }
    if (delta === 0) { buckets.today.count += 1; buckets.today.amount += remaining; }
    if (delta > 0 && delta <= 3) { buckets.next3.count += 1; buckets.next3.amount += remaining; }
    if (delta > 0 && delta <= 7) { buckets.next7.count += 1; buckets.next7.amount += remaining; }
  }
  const windows = Array.isArray(config.windows) ? config.windows.map(Number) : [0, 3, 7];
  const lines = [`📅 <b>تاریخ:</b> ${jalaliDate}`];
  if (config.includeOverdue !== false) lines.push(`🔴 <b>معوق:</b> ${buckets.overdue.count} مورد — ${formatMoney(buckets.overdue.amount)}`);
  if (windows.includes(0)) lines.push(`🟠 <b>سررسید امروز:</b> ${buckets.today.count} مورد — ${formatMoney(buckets.today.amount)}`);
  if (windows.includes(3)) lines.push(`🟡 <b>۳ روز آینده:</b> ${buckets.next3.count} مورد — ${formatMoney(buckets.next3.amount)}`);
  if (windows.includes(7)) lines.push(`🟢 <b>۷ روز آینده:</b> ${buckets.next7.count} مورد — ${formatMoney(buckets.next7.amount)}`);
  return { title: "گزارش صبح اقساط", notificationKey: "report.installments.morning", sourceEventType: "MANAGER_REPORT_MORNING_INSTALLMENTS", text: `⏰ <b>گزارش صبح اقساط</b>\n\n${lines.join("\n")}` };
};

const hydrateSchedule = async (scheduleId: number): Promise<ScheduleRow | undefined> => getTypedAsync<ScheduleRow>(
  `SELECT s.id,s.tenant_membership_id AS membershipId,m.user_id AS userId,s.report_key AS reportKey,
          s.local_time AS localTime,s.timezone,s.is_enabled AS isEnabled,s.channels_json AS channelsJson,
          s.config_json AS configJson,s.catch_up_policy AS catchUpPolicy,s.max_age_minutes AS maxAgeMinutes,
          s.grace_minutes AS graceMinutes,s.reconcile_from AS reconcileFrom,s.created_at AS createdAt,s.updated_at AS updatedAt
     FROM manager_report_schedules s JOIN tenant_memberships m ON m.id=s.tenant_membership_id
    WHERE s.id=? LIMIT 1`,
  [scheduleId],
);

const reconcileSchedule = async (schedule: ScheduleRow, now: Date): Promise<void> => {
  if (!schedule.isEnabled) return;
  const todayKey = dateKeyFor(now, schedule.timezone);
  let cursor = dateKeyFor(new Date(schedule.reconcileFrom || schedule.createdAt), schedule.timezone);
  const floor = addDateKeyDays(todayKey, -31);
  if (compareDateKeys(cursor, floor) < 0) cursor = floor;
  while (compareDateKeys(cursor, todayKey) <= 0) {
    const scheduled = zonedLocalToUtc(cursor, schedule.localTime, schedule.timezone);
    if (scheduled.getTime() <= now.getTime()) {
      const ageMinutes = Math.max(0, Math.floor((now.getTime() - scheduled.getTime()) / 60_000));
      const allowedAge = schedule.catchUpPolicy === "skip_if_old" ? schedule.graceMinutes : schedule.maxAgeMinutes;
      const status = ageMinutes <= allowedAge ? "scheduled" : "skipped";
      const reason = status === "skipped" ? (schedule.catchUpPolicy === "skip_if_old" ? "missed_skip_if_old_window" : "catch_up_window_expired") : null;
      await runAsync(
        `INSERT OR IGNORE INTO scheduled_job_runs(schedule_id,scheduled_for,status,delivery_status,last_error,completed_at)
         VALUES(?,?,?,?,?,CASE WHEN ?='skipped' THEN strftime('%Y-%m-%dT%H:%M:%SZ','now','utc') ELSE NULL END)`,
        [schedule.id, scheduled.toISOString(), status, status === "skipped" ? "none" : "pending", reason, status],
      );
    }
    cursor = addDateKeyDays(cursor, 1);
  }
  await runAsync(
    "UPDATE manager_report_schedules SET reconcile_from=?,updated_at=updated_at WHERE id=?",
    [now.toISOString(), schedule.id],
  );
};

const claimRun = async (run: JobRow): Promise<boolean> => {
  const result = await runAsync(
    `UPDATE scheduled_job_runs
        SET status='running',started_at=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc'),executed_at=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc'),
            updated_at=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc')
      WHERE id=? AND (status='scheduled' OR (status='failed' AND retry_count<3 AND (next_retry_at IS NULL OR datetime(next_retry_at)<=datetime('now'))))`,
    [run.id],
  );
  return result.changes > 0;
};

const executeRun = async (
  run: JobRow,
  publishTargeted: ManagerScheduledReportPublisher,
  formatMoney: (value: unknown) => string,
): Promise<void> => {
  if (!(await claimRun(run))) return;
  const schedule = await hydrateSchedule(run.scheduleId);
  if (!schedule || !schedule.isEnabled) {
    await runAsync(
      `UPDATE scheduled_job_runs SET status='skipped',delivery_status='none',last_error='schedule_disabled_or_missing',completed_at=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc'),updated_at=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc') WHERE id=?`,
      [run.id],
    );
    return;
  }
  // Render the report for the occurrence date, not the wall-clock execution date.
  schedule.reconcileFrom = run.scheduledFor;
  try {
    const report = schedule.reportKey === "nightly_sales"
      ? await buildNightlySalesReport(schedule, formatMoney)
      : await buildMorningInstallmentsReport(schedule, formatMoney);
    const channels = parseChannels(schedule.channelsJson);
    const result = await publishTargeted({
      userId: schedule.userId,
      notificationKey: report.notificationKey,
      sourceEventType: report.sourceEventType,
      title: report.title,
      text: report.text,
      channels,
      meta: { entityType: "manager_report_schedule", entityId: schedule.id, data: { scheduleId: schedule.id, scheduledFor: run.scheduledFor, reportKey: schedule.reportKey } },
    });
    if (result.reason === "target_not_authorized" || Number(result.recipients || 0) === 0) {
      await runAsync(
        `UPDATE scheduled_job_runs SET status='skipped',delivery_status='none',last_error='manager_permission_revoked',result_json=?,completed_at=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc'),updated_at=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc') WHERE id=?`,
        [JSON.stringify(result), run.id],
      );
      return;
    }
    const inApp = Number(result.inApp || 0);
    const telegram = Number(result.telegram || 0);
    const deliveryStatus = telegram > 0 ? (inApp > 0 ? "queued_and_delivered" : "queued") : inApp > 0 ? "delivered" : "none";
    await runAsync(
      `UPDATE scheduled_job_runs SET status='completed',delivery_status=?,last_error=NULL,result_json=?,completed_at=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc'),updated_at=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc') WHERE id=?`,
      [deliveryStatus, JSON.stringify(result), run.id],
    );
  } catch (error) {
    const message = String((error as any)?.message || "manager_scheduled_report_failed").slice(0, 500);
    if (message === "MANAGER_REPORT_PERMISSION_REVOKED") {
      await runAsync(
        `UPDATE scheduled_job_runs SET status='skipped',delivery_status='none',last_error=?,completed_at=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc'),updated_at=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc') WHERE id=?`,
        [message, run.id],
      );
      return;
    }
    const retryCount = Number(run.retryCount || 0) + 1;
    const delayMinutes = Math.min(60, Math.max(5, 5 * (2 ** Math.max(0, retryCount - 1))));
    const nextRetryAt = retryCount < 3 ? new Date(Date.now() + delayMinutes * 60_000).toISOString() : null;
    await runAsync(
      `UPDATE scheduled_job_runs SET status='failed',delivery_status='failed',retry_count=?,next_retry_at=?,last_error=?,updated_at=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc') WHERE id=?`,
      [retryCount, nextRetryAt, message, run.id],
    );
  }
};

export const runManagerScheduledReportsTick = async (deps: {
  publishTargeted: ManagerScheduledReportPublisher;
  formatMoney: (value: unknown) => string;
  now?: Date;
}): Promise<void> => {
  await ensureDefaultManagerReportSchedules();
  const now = deps.now || new Date();
  const schedules = await allTypedAsync<ScheduleRow>(
    `SELECT s.id,s.tenant_membership_id AS membershipId,m.user_id AS userId,s.report_key AS reportKey,
            s.local_time AS localTime,s.timezone,s.is_enabled AS isEnabled,s.channels_json AS channelsJson,
            s.config_json AS configJson,s.catch_up_policy AS catchUpPolicy,s.max_age_minutes AS maxAgeMinutes,
            s.grace_minutes AS graceMinutes,s.reconcile_from AS reconcileFrom,s.created_at AS createdAt,s.updated_at AS updatedAt
       FROM manager_report_schedules s JOIN tenant_memberships m ON m.id=s.tenant_membership_id
      WHERE s.is_enabled=1 AND m.status='active' ORDER BY s.id ASC`,
  );
  for (const schedule of schedules) {
    // eslint-disable-next-line no-await-in-loop
    await reconcileSchedule(schedule, now);
  }
  const dueRuns = await allTypedAsync<JobRow>(
    `SELECT id,schedule_id AS scheduleId,scheduled_for AS scheduledFor,status,retry_count AS retryCount
       FROM scheduled_job_runs
      WHERE datetime(scheduled_for)<=datetime(?)
        AND (status='scheduled' OR (status='failed' AND retry_count<3 AND (next_retry_at IS NULL OR datetime(next_retry_at)<=datetime(?))))
      ORDER BY scheduled_for ASC,id ASC LIMIT 50`,
    [now.toISOString(), now.toISOString()],
  );
  for (const run of dueRuns) {
    // eslint-disable-next-line no-await-in-loop
    await executeRun(run, deps.publishTargeted, deps.formatMoney);
  }
};

let schedulerTimer: ReturnType<typeof setInterval> | null = null;
let schedulerRunning = false;

export const startManagerScheduledReportScheduler = async (deps: {
  publishTargeted: ManagerScheduledReportPublisher;
  formatMoney: (value: unknown) => string;
}): Promise<void> => {
  if (schedulerTimer) return;
  const tick = async () => {
    if (schedulerRunning) return;
    schedulerRunning = true;
    try {
      await runManagerScheduledReportsTick(deps);
    } catch (error) {
      console.error("Manager scheduled report tick failed:", error);
    } finally {
      schedulerRunning = false;
    }
  };
  await tick();
  schedulerTimer = setInterval(() => { void tick(); }, 60_000);
  schedulerTimer.unref?.();
};

export const listManagerScheduledJobRuns = async (userId: number, limit = 50) => {
  await ensureDefaultManagerReportSchedules();
  const authorization = await requireTargetAuthorization(userId);
  const safeLimit = Math.max(1, Math.min(100, Math.floor(Number(limit) || 50)));
  return allTypedAsync<{
    id: number; scheduleId: number; reportKey: string; scheduledFor: string; status: string;
    deliveryStatus: string; retryCount: number; executedAt: string | null; completedAt: string | null; lastError: string | null;
  }>(
    `SELECT r.id,r.schedule_id AS scheduleId,s.report_key AS reportKey,r.scheduled_for AS scheduledFor,r.status,
            r.delivery_status AS deliveryStatus,r.retry_count AS retryCount,r.executed_at AS executedAt,r.completed_at AS completedAt,r.last_error AS lastError
       FROM scheduled_job_runs r JOIN manager_report_schedules s ON s.id=r.schedule_id
      WHERE s.tenant_membership_id=? ORDER BY r.scheduled_for DESC,r.id DESC LIMIT ?`,
    [authorization.membershipId, safeLimit],
  );
};
