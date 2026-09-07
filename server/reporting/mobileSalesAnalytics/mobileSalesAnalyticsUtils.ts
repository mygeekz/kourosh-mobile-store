import moment from "jalali-moment";

export const mobileAnalyticsNumber = (value: any) =>
  Number.isFinite(Number(value)) ? Number(value) : 0;

// Kept as a compatibility name: report values must preserve the backend number without display rounding.
export const mobileAnalyticsRound = (value: any) => mobileAnalyticsNumber(value);

export const mobileAnalyticsPct = (part: number, total: number) =>
  total > 0 ? Math.max(0, Math.min(100, (part / total) * 100)) : 0;

export const mobileAnalyticsDateMoment = (value: any) => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const mJ = moment(raw, ["jYYYY/jMM/jDD", "jYYYY/j/M/jD"], true);
  if (mJ.isValid()) return mJ;
  const m = moment(raw, [moment.ISO_8601, "YYYY-MM-DD", "YYYY/MM/DD"], true);
  return m.isValid() ? m : null;
};

export const mobileAnalyticsRiskMeta = (score: number) => {
  const s = Math.max(0, Math.min(100, mobileAnalyticsNumber(score)));
  if (s >= 82) return { level: "critical", label: "بحرانی", tone: "rose" };
  if (s >= 62) return { level: "high", label: "پرریسک", tone: "orange" };
  if (s >= 38)
    return { level: "followup", label: "قابل پیگیری", tone: "amber" };
  return { level: "low", label: "کم‌ریسک", tone: "emerald" };
};

export const sumMobileAnalyticsBy = (rows: any[], key: string) =>
  rows.reduce((sum, row) => sum + mobileAnalyticsNumber(row[key]), 0);

export const sortMobileAnalyticsRowsBySaleDateDesc = (rows: any[]) =>
  rows.sort((a: any, b: any) =>
    String(b.saleDate || "").localeCompare(String(a.saleDate || "")),
  );
