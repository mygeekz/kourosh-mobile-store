import moment from "jalali-moment";

export type AutoSendMode = "off" | "sms" | "telegram" | "both";

export const normalizeAutoSendMode = (v: any): AutoSendMode => {
  const s = String(v || "off").toLowerCase();
  if (s === "sms") return "sms";
  if (s === "telegram") return "telegram";
  if (s === "both") return "both";
  return "off";
};

export const parseTimeHHmm = (s: string): { h: number; m: number } | null => {
  const m = String(s || "")
    .trim()
    .match(/^([0-1]?\d|2[0-3]):([0-5]\d)$/);
  if (!m) return null;
  return { h: Number(m[1]), m: Number(m[2]) };
};

// telegram_silent_hours format: "22:00-08:00" (Tehran time, +03:30)
export const computeNextAllowedTelegramSendISO = (
  silent: string | undefined | null,
): string | null => {
  const raw = String(silent || "").trim();
  if (!raw) return null;
  const parts = raw.split("-").map((p) => p.trim());
  if (parts.length !== 2) return null;
  const start = parseTimeHHmm(parts[0]);
  const end = parseTimeHHmm(parts[1]);
  if (!start || !end) return null;
  const nowTehran = moment().utcOffset(210);
  const startToday = nowTehran
    .clone()
    .hour(start.h)
    .minute(start.m)
    .second(0)
    .millisecond(0);
  const endToday = nowTehran
    .clone()
    .hour(end.h)
    .minute(end.m)
    .second(0)
    .millisecond(0);
  const crossesMidnight = endToday.isSameOrBefore(startToday);
  const inSilent = (() => {
    if (!crossesMidnight)
      return nowTehran.isSameOrAfter(startToday) && nowTehran.isBefore(endToday);
    return nowTehran.isSameOrAfter(startToday) || nowTehran.isBefore(endToday);
  })();
  if (!inSilent) return null;
  const next = crossesMidnight
    ? nowTehran.isBefore(endToday)
      ? endToday
      : endToday.clone().add(1, "day")
    : endToday;
  return next.clone().utc().toISOString();
};

// Quiet Hours (start/end hour) in Tehran time, e.g. 21 -> 10
export const computeNextAllowedTelegramSendISOFromHours = (
  startHourRaw: any,
  endHourRaw: any,
): string | null => {
  const startHour = Number(startHourRaw);
  const endHour = Number(endHourRaw);
  if (!Number.isFinite(startHour) || !Number.isFinite(endHour)) return null;
  if (startHour < 0 || startHour > 23 || endHour < 0 || endHour > 23) return null;
  const nowTehran = moment().utcOffset(210);
  const start = nowTehran.clone().hour(startHour).minute(0).second(0).millisecond(0);
  const end = nowTehran.clone().hour(endHour).minute(0).second(0).millisecond(0);
  const crossesMidnight = end.isSameOrBefore(start);
  const inQuiet = (() => {
    if (!crossesMidnight) return nowTehran.isSameOrAfter(start) && nowTehran.isBefore(end);
    return nowTehran.isSameOrAfter(start) || nowTehran.isBefore(end);
  })();
  if (!inQuiet) return null;
  const next = crossesMidnight
    ? nowTehran.isBefore(end)
      ? end
      : end.clone().add(1, "day")
    : end;
  return next.clone().utc().toISOString();
};

export const classifyTelegramError = (msg: any) => {
  const s = String(msg || "").toLowerCase();
  if (!s) return { code: "other" as const, label: "other" };
  if (
    s.includes("bot was blocked") ||
    s.includes("blocked by the user") ||
    (s.includes("forbidden") && s.includes("blocked"))
  ) {
    return { code: "blocked" as const, label: "blocked" };
  }
  if (s.includes("chat not found") || s.includes("user is deactivated")) {
    return { code: "chat_not_found" as const, label: "chat not found" };
  }
  if (
    s.includes("proxy") ||
    s.includes("socks") ||
    s.includes("econnrefused") ||
    s.includes("etimedout") ||
    s.includes("tunnel") ||
    s.includes("fetch failed")
  ) {
    return { code: "proxy_error" as const, label: "proxy error" };
  }
  return { code: "other" as const, label: "other" };
};

export function createCustomerTelegramValidityHelpers(deps: {
  ensureCustomerTelegramColumns: () => Promise<any>;
  getAsync: (sql: string, params?: any[]) => Promise<any>;
  runAsync: (sql: string, params?: any[]) => Promise<any>;
}) {
  const ensureCustomerIsNotInvalid = async (customerId: number): Promise<boolean> => {
    if (!customerId) return true;
    try {
      await deps.ensureCustomerTelegramColumns();
      const row = await deps
        .getAsync(`SELECT telegram_invalid as invalid FROM customers WHERE id=? LIMIT 1`, [
          customerId,
        ])
        .catch(() => null);
      return String(row?.invalid || "0") !== "1";
    } catch {
      return true;
    }
  };

  const markCustomerTelegramInvalid = async (customerId: number, reason: string) => {
    if (!customerId) return;
    try {
      await deps.ensureCustomerTelegramColumns();
      await deps
        .runAsync(
          `UPDATE customers SET telegram_invalid=1, telegram_invalid_reason=?, telegram_invalid_at=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc') WHERE id=?`,
          [String(reason || "invalid"), customerId],
        )
        .catch(() => {});
    } catch {
      // ignore
    }
  };

  return { ensureCustomerIsNotInvalid, markCustomerTelegramInvalid };
}
