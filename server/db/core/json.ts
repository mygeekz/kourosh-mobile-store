// Shared JSON/money helpers extracted from legacyRuntime in Phase 1I.

export const safeJsonStringify = (value: any): string | null => {
  if (value === undefined || value === null) return null;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
};

export const safeJsonParse = <T = any>(value: any): T | null => {
  if (!value || typeof value !== "string") return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

export const normalizeMoney = (value: any): number | null => {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};
