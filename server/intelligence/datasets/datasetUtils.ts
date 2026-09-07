export const safeParseJson = <T = Record<string, unknown>>(value: unknown, fallback: T): T => {
  if (!value || typeof value !== "string") return fallback;
  try {
    const parsed = JSON.parse(value) as T;
    return parsed ?? fallback;
  } catch (_err) {
    return fallback;
  }
};

export const normalizeDatasetNumber = (value: unknown, fallback: number | null = null): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

export const toBinaryLabel = (value: unknown): 0 | 1 | null => {
  if (value === true) return 1;
  if (value === false) return 0;
  if (value === 1 || value === "1") return 1;
  if (value === 0 || value === "0") return 0;
  return null;
};

export const severityToScore = (severity: unknown): number => {
  switch (String(severity || "").toLowerCase()) {
    case "critical":
      return 4;
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
    default:
      return 0;
  }
};

export const escapeCsvValue = (value: unknown): string => {
  if (value == null) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

export const rowsToCsv = (headers: string[], rows: Array<Record<string, unknown>>): string => {
  const lines = [headers.map(escapeCsvValue).join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => escapeCsvValue(row[header])).join(","));
  }
  return `${lines.join("\n")}\n`;
};
